import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, listen } from './helpers';
import type { Server } from 'node:http';

let server: Server | undefined;
afterEach(() => server?.close());

describe('mock supplier endpoints', () => {
  it('Supplier A and B return valid, different JSON for a city', async () => {
    const { app } = await buildTestApp();
    const a = await request(app).get('/supplierA/hotels?city=delhi').expect(200);
    const b = await request(app).get('/supplierB/hotels?city=delhi').expect(200);
    expect(a.body.length).toBeGreaterThan(0);
    expect(a.body[0]).toEqual(expect.objectContaining({ hotelId: 'a1', name: 'The Grand Palace', price: 6500, city: 'delhi', commissionPct: 12, rating: 4.5 }));
    expect(b.body[0]).toEqual(expect.objectContaining({ hotelId: 'b1', price: 5900, commissionPct: 18 }));
    expect(a.body.every((h: { city: string }) => h.city === 'delhi')).toBe(true);
  });

  it('filters by city (case-insensitive), returns [] for unknown, 400 without city', async () => {
    const { app } = await buildTestApp();
    expect((await request(app).get('/supplierA/hotels?city=MUMBAI')).body.every((h: { city: string }) => h.city === 'mumbai')).toBe(true);
    expect((await request(app).get('/supplierB/hotels?city=nowhere')).body).toEqual([]);
    await request(app).get('/supplierA/hotels').expect(400);
  });

  it('simulates outages and errors; dev endpoint toggles them', async () => {
    const { app, container } = await buildTestApp();
    await request(app).post('/api/dev/suppliers/supplierA').send({ enabled: false }).expect(200);
    expect(container.simulations.supplierA.enabled).toBe(false);
    await request(app).get('/supplierA/hotels?city=delhi').expect(503);
    await request(app).get('/supplierA/health').expect(503);
    await request(app).post('/api/dev/suppliers/supplierB').send({ errorRate: 1 }).expect(200);
    await request(app).get('/supplierB/hotels?city=delhi').expect(500);
    await request(app).post('/api/dev/suppliers/reset').expect(200);
    await request(app).get('/supplierA/hotels?city=delhi').expect(200);
    await request(app).get('/supplierB/hotels?city=delhi').expect(200);
    await request(app).post('/api/dev/suppliers/supplierZ').send({}).expect(404);
    await request(app).post('/api/dev/suppliers/supplierA').send({ errorRate: 5 }).expect(400);
  });

  it('hides dev endpoints in production', async () => {
    const { app } = await buildTestApp({ NODE_ENV: 'production' });
    await request(app).post('/api/dev/suppliers/supplierA').send({ enabled: false }).expect(404);
  });
});

describe('GET /health', () => {
  async function start(overrides: Record<string, string> = {}) {
    const test = await buildTestApp(overrides);
    const started = await listen(test.app);
    server = started.server;
    // Point the health probes at the live test server (suppliers are reached over HTTP).
    Object.assign(test.container.env, {
      SUPPLIER_A_URL: `http://127.0.0.1:${started.port}/supplierA`,
      SUPPLIER_B_URL: `http://127.0.0.1:${started.port}/supplierB`,
    });
    return test;
  }

  it('reports healthy when every dependency is up', async () => {
    const { app } = await start();
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services).toEqual({ api: 'healthy', redis: 'healthy', temporal: 'healthy', supplierA: 'healthy', supplierB: 'healthy' });
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  it('is degraded (still 200) when a supplier is down', async () => {
    const { app, container } = await start();
    container.simulations.supplierA.enabled = false;
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services).toMatchObject({ supplierA: 'unhealthy', supplierB: 'healthy', redis: 'healthy' });
  });

  it('is unhealthy (503) when Temporal is unreachable', async () => {
    const { app, runner } = await start();
    runner.temporalUp = false;
    const res = await request(app).get('/health').expect(503);
    expect(res.body.status).toBe('unhealthy');
    expect(res.body.services.temporal).toBe('unhealthy');
  });

  it('is unhealthy (503) when Redis is unreachable', async () => {
    const { app, redis } = await start();
    redis.ping = (async () => { throw new Error('down'); }) as typeof redis.ping;
    const res = await request(app).get('/health').expect(503);
    expect(res.body.services.redis).toBe('unhealthy');
  });
});
