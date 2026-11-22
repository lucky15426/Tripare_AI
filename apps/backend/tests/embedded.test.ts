import type { Server } from 'node:http';
import RedisMock from 'ioredis-mock';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { RedisClient } from '../src/cache/redis';
import { loadEnv } from '../src/config/env';
import { createContainer } from '../src/container';
import { startBackground, type Background } from '../src/embedded';
import { listen } from './helpers';

/** Single-service mode: embedded Temporal dev server + in-process worker + API, no external Temporal. */
describe('single-process mode (EMBEDDED_TEMPORAL)', () => {
  let server: Server;
  let background: Background | null;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const env = loadEnv({ NODE_ENV: 'test', EMBEDDED_TEMPORAL: 'true', SUPPLIER_A_LATENCY_MS: '0', SUPPLIER_B_LATENCY_MS: '0', TEMPORAL_ADDRESS: 'nowhere:1' });
    const redis = new RedisMock() as unknown as RedisClient;
    await redis.flushall();
    const container = createContainer(env, { redis });
    app = createApp(container);
    const started = await listen(app);
    server = started.server;
    // PaaS case: SUPPLIER_*_URL unset => defaults to this process on the injected PORT.
    expect(env.SUPPLIER_A_URL).toBe(`http://127.0.0.1:${env.PORT}/supplierA`);
    Object.assign(env, { SUPPLIER_A_URL: `http://127.0.0.1:${started.port}/supplierA`, SUPPLIER_B_URL: `http://127.0.0.1:${started.port}/supplierB` });
    background = await startBackground(env, redis, 17234);
  });

  afterAll(async () => {
    await background?.stop();
    server?.close();
  });

  it('answers /healthz immediately and reports Temporal healthy once embedded Temporal is up', async () => {
    await request(app).get('/healthz').expect(200);
    const health = await request(app).get('/health');
    expect(health.body.services.temporal).toBe('healthy');
    expect(health.body.services.redis).toBe('healthy');
  });

  it('serves a real search through the embedded Temporal workflow', async () => {
    const res = await request(app).get('/api/hotels?city=delhi').expect(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body.data).toHaveLength(7);
    expect(res.body.meta.degraded).toBe(false);
    await request(app).get('/api/hotels?city=delhi&maxPrice=3000').expect(200);
  });
});
