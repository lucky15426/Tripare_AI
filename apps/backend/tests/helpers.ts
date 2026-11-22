import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import RedisMock from 'ioredis-mock';
import { createApp } from '../src/app';
import { HotelCache } from '../src/cache/hotelCache';
import type { RedisClient } from '../src/cache/redis';
import { loadEnv, type Env } from '../src/config/env';
import { createContainer, type Container } from '../src/container';
import { aggregateOffers, normalizeSupplierOffers } from '../src/services/offers';
import { supplierAHotels } from '../src/suppliers/supplierA';
import { supplierBHotels } from '../src/suppliers/supplierB';
import { AllSuppliersFailedError, type WorkflowRunner } from '../src/temporal/client';
import type { HotelOfferWorkflowInput, HotelOfferWorkflowResult, SupplierKey, SupplierOutcome } from '../src/types';

export const testEnv = (overrides: Record<string, string> = {}): Env =>
  loadEnv({ NODE_ENV: 'test', SUPPLIER_A_LATENCY_MS: '0', SUPPLIER_B_LATENCY_MS: '0', ...overrides });

/**
 * Stand-in for Temporal in API-level tests: runs the same pure aggregation code the
 * real activities use and writes to the same cache. The real workflow is covered in workflow.test.ts.
 */
export class FakeRunner implements WorkflowRunner {
  calls: string[] = [];
  failing: Record<SupplierKey, boolean> = { supplierA: false, supplierB: false };
  temporalUp = true;

  constructor(private readonly cache: HotelCache) {}

  async ping() {
    return this.temporalUp;
  }

  async run(workflowId: string, input: HotelOfferWorkflowInput): Promise<HotelOfferWorkflowResult> {
    this.calls.push(workflowId);
    const status = Object.fromEntries(
      (['supplierA', 'supplierB'] as const).map((key) => [key, this.failing[key] ? 'failed' : 'success']),
    ) as Record<SupplierKey, SupplierOutcome>;
    const base = { supplierStatus: status, supplierErrors: {}, supplierAttempts: {}, steps: [], startedAt: new Date().toISOString(), durationMs: 5 };
    if (this.failing.supplierA && this.failing.supplierB) throw new AllSuppliersFailedError(workflowId, base);

    const offers = [
      ...(this.failing.supplierA ? [] : normalizeSupplierOffers('Supplier A', supplierAHotels.filter((h) => h.city === input.city)).offers),
      ...(this.failing.supplierB ? [] : normalizeSupplierOffers('Supplier B', supplierBHotels.filter((h) => h.city === input.city)).offers),
    ];
    const lastUpdated = new Date().toISOString();
    const hotels = aggregateOffers(offers, input.city, lastUpdated);
    const degraded = this.failing.supplierA || this.failing.supplierB;
    const cacheMeta = { city: input.city, totalHotels: hotels.length, lastUpdated, workflowId, supplierStatus: status, degraded, cityInfo: null };
    await this.cache.replaceCity(input.city, hotels, cacheMeta, degraded ? input.degradedCacheTtlSeconds : input.cacheTtlSeconds);
    return { workflowId, city: input.city, hotelCount: hotels.length, supplierDurations: { supplierA: 10 }, rejectedOffers: 0, degraded, cacheMeta, ...base };
  }
}

export interface TestApp {
  container: Container;
  runner: FakeRunner;
  app: ReturnType<typeof createApp>;
  redis: RedisClient;
}

export async function buildTestApp(envOverrides: Record<string, string> = {}): Promise<TestApp> {
  const redis = new RedisMock() as unknown as RedisClient;
  await redis.flushall();
  const runner = new FakeRunner(new HotelCache(redis));
  const container = createContainer(testEnv(envOverrides), { redis, runner });
  return { container, runner, app: createApp(container), redis };
}

export const listen = (app: ReturnType<typeof createApp>): Promise<{ server: Server; port: number }> =>
  new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, port: (server.address() as AddressInfo).port }));
  });
