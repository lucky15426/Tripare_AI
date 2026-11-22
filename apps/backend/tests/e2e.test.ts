import path from 'node:path';
import type { Server } from 'node:http';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import RedisMock from 'ioredis-mock';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createActivities } from '../src/activities';
import { createApp } from '../src/app';
import { HotelCache } from '../src/cache/hotelCache';
import type { RedisClient } from '../src/cache/redis';
import { createContainer, type Container } from '../src/container';
import { listen, testEnv } from './helpers';

const TEMPORAL_PORT = 17233;

/**
 * Full path: HTTP request -> Express -> TemporalRunner (real client) -> real Temporal server
 * -> real worker/workflow/activities -> mock suppliers over HTTP -> Redis (in-memory mock) -> HTTP response.
 */
describe('API + real Temporal (end to end)', () => {
  let temporal: TestWorkflowEnvironment;
  let worker: Worker;
  let workerRun: Promise<void>;
  let server: Server;
  let container: Container;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const redis = new RedisMock() as unknown as RedisClient;
    await redis.flushall();
    temporal = await TestWorkflowEnvironment.createLocal({ server: { ip: '127.0.0.1', port: TEMPORAL_PORT } });

    container = createContainer(
      testEnv({
        TEMPORAL_ADDRESS: `127.0.0.1:${TEMPORAL_PORT}`,
        TEMPORAL_TASK_QUEUE: 'e2e',
        SUPPLIER_A_LATENCY_MS: '150',
        SUPPLIER_B_LATENCY_MS: '300',
        SUPPLIER_TIMEOUT_MS: '2000',
        SUPPLIER_RETRY_INITIAL_MS: '100',
        SUPPLIER_RETRY_MAX_ATTEMPTS: '2',
      }),
      { redis },
    );
    app = createApp(container);
    const started = await listen(app);
    server = started.server;
    Object.assign(container.env, {
      SUPPLIER_A_URL: `http://127.0.0.1:${started.port}/supplierA`,
      SUPPLIER_B_URL: `http://127.0.0.1:${started.port}/supplierB`,
    });

    worker = await Worker.create({
      connection: temporal.nativeConnection,
      taskQueue: 'e2e',
      workflowsPath: path.join(__dirname, '../src/workflows/index.ts'),
      activities: createActivities({ env: container.env, cache: new HotelCache(redis) }),
    });
    workerRun = worker.run();
  });

  afterAll(async () => {
    worker?.shutdown();
    await workerRun;
    await temporal?.teardown();
    server?.close();
  });

  it('health reports a live Temporal connection and healthy suppliers', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'healthy', services: { temporal: 'healthy', redis: 'healthy', supplierA: 'healthy', supplierB: 'healthy' } });
  });

  it('miss -> Temporal workflow -> Redis; second request is a HIT; filters served from Redis', async () => {
    const miss = await request(app).get('/api/hotels?city=Delhi').expect(200);
    expect(miss.headers['x-cache']).toBe('MISS');
    expect(miss.body.meta.workflowId).toMatch(/^hotel-offers-delhi-/);
    expect(miss.body.data).toHaveLength(7);
    expect(miss.body.data.find((h: { slug: string }) => h.slug === 'grand palace')).toMatchObject({ supplier: 'Supplier B', price: 5900, savings: 600 });
    expect(miss.body.meta.cityInfo).toMatchObject({ source: 'builtin' });

    const hit = await request(app).get('/api/hotels?city=delhi&minPrice=3000&maxPrice=8000&sortBy=rating&sortOrder=desc').expect(200);
    expect(hit.headers['x-cache']).toBe('HIT');
    expect(hit.body.meta.workflowId).toBe(miss.body.meta.workflowId);
    expect(hit.body.data.every((h: { price: number }) => h.price >= 3000 && h.price <= 8000)).toBe(true);

    const runs = await request(app).get('/api/workflows').expect(200);
    expect(runs.body.data[0]).toMatchObject({ workflowId: miss.body.meta.workflowId, status: 'COMPLETED' });
    expect(runs.body.data[0].steps.map((s: { name: string }) => s.name)).toContain('saveToRedis');
  });

  it('refresh=true runs a new workflow with a new id', async () => {
    const before = await request(app).get('/api/hotels?city=delhi');
    const refreshed = await request(app).get('/api/hotels?city=delhi&refresh=true').expect(200);
    expect(refreshed.headers['x-cache']).toBe('MISS');
    expect(refreshed.body.meta.workflowId).not.toBe(before.body.meta.workflowId);
  });

  it('serves partial data with degraded=true when Supplier A is down (real retries)', async () => {
    await request(app).post('/api/dev/suppliers/supplierA').send({ enabled: false }).expect(200);
    const res = await request(app).get('/api/hotels?city=mumbai').expect(200);
    expect(res.body.meta).toMatchObject({ degraded: true, supplierStatus: { supplierA: 'failed', supplierB: 'success' } });
    expect(res.body.data.every((h: { supplier: string }) => h.supplier === 'Supplier B')).toBe(true);
    const metrics = await request(app).get('/api/metrics');
    expect(metrics.body.data.supplierFailures).toBeGreaterThanOrEqual(1);
  });

  it('returns 502 with failure metadata when both suppliers are down', async () => {
    await request(app).post('/api/dev/suppliers/supplierB').send({ enabled: false }).expect(200);
    const res = await request(app).get('/api/hotels?city=goa').expect(502);
    expect(res.body.error.code).toBe('ALL_SUPPLIERS_FAILED');
    expect(res.body.meta.supplierStatus).toEqual({ supplierA: 'failed', supplierB: 'failed' });
    const runs = await request(app).get('/api/workflows');
    expect(runs.body.data[0]).toMatchObject({ city: 'goa', status: 'FAILED' });
    await request(app).post('/api/dev/suppliers/reset').expect(200);
  });
});
