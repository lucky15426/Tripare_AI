import path from 'node:path';
import type { Server } from 'node:http';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { WorkflowFailedError } from '@temporalio/client';
import { ApplicationFailure } from '@temporalio/common';
import RedisMock from 'ioredis-mock';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createActivities } from '../src/activities';
import { createApp } from '../src/app';
import { HotelCache } from '../src/cache/hotelCache';
import type { RedisClient } from '../src/cache/redis';
import { createContainer, type Container } from '../src/container';
import type { HotelOfferWorkflowInput, HotelOfferWorkflowResult } from '../src/types';
import { listen, testEnv } from './helpers';

/**
 * Runs the REAL workflow + REAL activities on a REAL Temporal dev server (downloaded and started by
 * @temporalio/testing). Suppliers are the real mock-supplier HTTP endpoints; only Redis is an in-memory mock.
 */
describe('hotelOfferWorkflow on a real Temporal server', () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;
  let workerRun: Promise<void>;
  let server: Server;
  let container: Container;
  let redis: RedisClient;
  let cache: HotelCache;
  const taskQueue = `test-${Date.now()}`;

  const input = (city: string, retryMaxAttempts = 2): HotelOfferWorkflowInput => ({
    city,
    searchParams: {},
    requestId: 'test',
    cacheTtlSeconds: 300,
    degradedCacheTtlSeconds: 30,
    options: { timeoutMs: 2000, retryInitialMs: 100, retryBackoff: 2, retryMaxAttempts },
  });
  let counter = 0;
  const execute = (args: HotelOfferWorkflowInput): Promise<HotelOfferWorkflowResult> =>
    env.client.workflow.execute('hotelOfferWorkflow', { taskQueue, workflowId: `wf-${Date.now()}-${counter++}`, args: [args] });

  beforeAll(async () => {
    redis = new RedisMock() as unknown as RedisClient;
    cache = new HotelCache(redis);
    container = createContainer(testEnv({ SUPPLIER_A_LATENCY_MS: '300', SUPPLIER_B_LATENCY_MS: '300' }), { redis });
    const started = await listen(createApp(container));
    server = started.server;
    Object.assign(container.env, {
      SUPPLIER_A_URL: `http://127.0.0.1:${started.port}/supplierA`,
      SUPPLIER_B_URL: `http://127.0.0.1:${started.port}/supplierB`,
    });

    env = await TestWorkflowEnvironment.createLocal();
    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue,
      workflowsPath: path.join(__dirname, '../src/workflows/index.ts'),
      activities: createActivities({ env: container.env, cache }),
    });
    workerRun = worker.run();
  });

  afterAll(async () => {
    worker?.shutdown();
    await workerRun;
    await env?.teardown();
    server?.close();
  });

  beforeEach(async () => {
    await redis.flushall();
    container.simulations.supplierA.enabled = true;
    container.simulations.supplierB.enabled = true;
  });

  it('runs both suppliers concurrently, aggregates, and stores results in Redis', async () => {
    const result = await execute(input('delhi'));
    expect(result).toMatchObject({ city: 'delhi', hotelCount: 7, degraded: false, supplierStatus: { supplierA: 'success', supplierB: 'success' } });

    const stepA = result.steps.find((s) => s.name === 'supplierA')!;
    const stepB = result.steps.find((s) => s.name === 'supplierB')!;
    // Concurrency: B starts before A has finished (sequential execution would make this false).
    expect(stepB.startOffsetMs).toBeLessThan(stepA.startOffsetMs + stepA.durationMs);
    expect(result.steps.map((s) => s.name)).toEqual(expect.arrayContaining(['supplierA', 'supplierB', 'enrichCity', 'normalize', 'aggregate', 'saveToRedis']));
    expect(result.cacheMeta.cityInfo).toMatchObject({ source: 'builtin' });

    // Persisted in Redis (sorted set + hash + meta) by the saveToRedis activity.
    expect(await redis.zcard('hotel_prices:delhi')).toBe(7);
    const hotels = await cache.queryByPrice('delhi', 5000, 6000);
    expect(hotels.map((h) => h.name)).toContain('The Grand Palace');
    expect(hotels.find((h) => h.slug === 'grand palace')).toMatchObject({ supplier: 'Supplier B', price: 5900, savings: 600 });
    expect((await cache.getMeta('delhi'))?.workflowId).toBe(result.workflowId);
  });

  it('degrades gracefully when Supplier A is down: retries are exhausted, B data is served', async () => {
    container.simulations.supplierA.enabled = false;
    const result = await execute(input('delhi', 3));
    expect(result).toMatchObject({ degraded: true, hotelCount: 5, supplierStatus: { supplierA: 'failed', supplierB: 'success' } });
    expect(container.simulations.supplierA.requests).toBeGreaterThanOrEqual(3); // really retried
    expect(result.supplierErrors.supplierA).toMatch(/503|unavailable/i);
    expect(result.steps.find((s) => s.name === 'supplierA')).toMatchObject({ status: 'failed', attempts: 3 });
    expect((await cache.getMeta('delhi'))?.degraded).toBe(true);
    expect((await cache.queryByPrice('delhi')).every((h) => h.supplier === 'Supplier B')).toBe(true);
  });

  it('fails the workflow with ALL_SUPPLIERS_FAILED when both suppliers are down, caching nothing', async () => {
    container.simulations.supplierA.enabled = false;
    container.simulations.supplierB.enabled = false;
    const error = await execute(input('delhi', 2)).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(WorkflowFailedError);
    const cause = (error as WorkflowFailedError).cause as ApplicationFailure;
    expect(cause.type).toBe('ALL_SUPPLIERS_FAILED');
    expect(await cache.getMeta('delhi')).toBeNull();
  });

  it('succeeds with zero hotels for a city no supplier serves', async () => {
    const result = await execute(input('atlantis'));
    expect(result.hotelCount).toBe(0);
    expect(await cache.queryByPrice('atlantis')).toEqual([]);
  });
});
