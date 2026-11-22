import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestApp } from './helpers';

let t: TestApp;
beforeEach(async () => {
  t = await buildTestApp();
});

describe('GET /api/hotels', () => {
  it('returns deduplicated hotels sorted by ascending price with the documented envelope', async () => {
    const res = await request(t.app).get('/api/hotels?city=delhi').expect(200);
    expect(res.body.data).toHaveLength(7);
    const prices = res.body.data.map((h: { price: number }) => h.price);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({ hotelId: expect.any(String), name: expect.any(String), city: 'delhi', price: expect.any(Number), supplier: expect.any(String), commissionPct: expect.any(Number), rating: expect.any(Number), latitude: expect.any(Number), longitude: expect.any(Number) }),
    );
    expect(res.body.data[0]).not.toHaveProperty('offers');
    expect(res.body.meta).toMatchObject({ city: 'delhi', totalHotels: 7, filteredHotels: 7, minPrice: null, maxPrice: null, cache: 'MISS', degraded: false });
    const palace = res.body.data.find((h: { name: string }) => h.name === 'The Grand Palace');
    expect(palace).toMatchObject({ supplier: 'Supplier B', price: 5900, savings: 600, competingOffers: 2 });
  });

  it('is a cache MISS then HIT, running the workflow only once', async () => {
    const first = await request(t.app).get('/api/hotels?city=Delhi');
    const second = await request(t.app).get('/api/hotels?city=delhi');
    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body.meta.cache).toBe('HIT');
    expect(t.runner.calls).toHaveLength(1);
    expect(first.headers['x-workflow-id']).toBe(second.headers['x-workflow-id']);
  });

  it('bypasses the cache with refresh=true and uses a new workflow id each time', async () => {
    await request(t.app).get('/api/hotels?city=delhi');
    const a = await request(t.app).get('/api/hotels?city=delhi&refresh=true');
    const b = await request(t.app).get('/api/hotels?city=delhi&refresh=true');
    expect(a.headers['x-cache']).toBe('MISS');
    expect(t.runner.calls).toHaveLength(3);
    expect(new Set(t.runner.calls).size).toBe(3);
    expect(a.body.meta.workflowId).not.toBe(b.body.meta.workflowId);
  });

  it('shares one workflow between concurrent misses for the same city', async () => {
    await Promise.all([1, 2, 3, 4].map(() => request(t.app).get('/api/hotels?city=mumbai')));
    expect(t.runner.calls).toHaveLength(1);
  });

  it('filters by price range inside Redis (min, max, both)', async () => {
    const both = await request(t.app).get('/api/hotels?city=delhi&minPrice=3000&maxPrice=8000');
    expect(both.body.data.every((h: { price: number }) => h.price >= 3000 && h.price <= 8000)).toBe(true);
    expect(both.body.meta).toMatchObject({ minPrice: 3000, maxPrice: 8000, totalHotels: 7 });
    expect(both.body.meta.filteredHotels).toBe(both.body.data.length);
    expect(both.body.data.length).toBeLessThan(7);

    const min = await request(t.app).get('/api/hotels?city=delhi&minPrice=7000');
    expect(min.body.data.every((h: { price: number }) => h.price >= 7000)).toBe(true);
    const max = await request(t.app).get('/api/hotels?city=delhi&maxPrice=3000');
    expect(max.body.data.map((h: { name: string }) => h.name).sort()).toEqual(['Karol Bagh Inn', 'Paharganj Backpackers']);
  });

  it('validates price parameters', async () => {
    for (const q of ['minPrice=abc', 'maxPrice=-5', 'minPrice=9000&maxPrice=1000', 'minPrice=Infinity']) {
      const res = await request(t.app).get(`/api/hotels?city=delhi&${q}`);
      expect(res.status, q).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect((await request(t.app).get('/api/hotels')).status).toBe(400);
    expect((await request(t.app).get('/api/hotels?city=delhi&sortBy=nope')).status).toBe(400);
    expect(t.runner.calls).toHaveLength(0); // invalid requests never reach Temporal
  });

  it('sorts by rating and commission in both directions', async () => {
    const rating = await request(t.app).get('/api/hotels?city=delhi&sortBy=rating&sortOrder=desc');
    const ratings = rating.body.data.map((h: { rating: number }) => h.rating);
    expect(ratings).toEqual([...ratings].sort((a: number, b: number) => b - a));
    const commission = await request(t.app).get('/api/hotels?city=delhi&sortBy=commission&sortOrder=asc');
    const commissions = commission.body.data.map((h: { commissionPct: number }) => h.commissionPct);
    expect(commissions).toEqual([...commissions].sort((a: number, b: number) => a - b));
    const price = await request(t.app).get('/api/hotels?city=delhi&sortOrder=desc');
    expect(price.body.data[0].price).toBeGreaterThan(price.body.data[6].price);
  });

  it('filters by supplier, rating and name', async () => {
    const bySupplier = await request(t.app).get('/api/hotels?city=delhi&supplier=Supplier%20A');
    expect(bySupplier.body.data.length).toBeGreaterThan(0);
    expect(bySupplier.body.data.every((h: { supplier: string }) => h.supplier === 'Supplier A')).toBe(true);
    expect((await request(t.app).get('/api/hotels?city=delhi&supplier=Nope')).status).toBe(400);
    const rated = await request(t.app).get('/api/hotels?city=delhi&minRating=4.5');
    expect(rated.body.data.every((h: { rating: number }) => h.rating >= 4.5)).toBe(true);
    const named = await request(t.app).get('/api/hotels?city=delhi&q=royal');
    expect(named.body.data.map((h: { name: string }) => h.name)).toEqual(['Hotel Royal']);
  });

  it('returns an empty successful result for a city with no hotels', async () => {
    const res = await request(t.app).get('/api/hotels?city=atlantis').expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ city: 'atlantis', totalHotels: 0, filteredHotels: 0 });
  });

  it('serves Supplier B hotels when Supplier A fails (degraded)', async () => {
    t.runner.failing.supplierA = true;
    const res = await request(t.app).get('/api/hotels?city=delhi').expect(200);
    expect(res.body.meta).toMatchObject({ degraded: true, supplierStatus: { supplierA: 'failed', supplierB: 'success' } });
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data.every((h: { supplier: string }) => h.supplier === 'Supplier B')).toBe(true);
  });

  it('serves Supplier A hotels when Supplier B fails (degraded)', async () => {
    t.runner.failing.supplierB = true;
    const res = await request(t.app).get('/api/hotels?city=delhi').expect(200);
    expect(res.body.meta.supplierStatus).toEqual({ supplierA: 'success', supplierB: 'failed' });
    expect(res.body.data.every((h: { supplier: string }) => h.supplier === 'Supplier A')).toBe(true);
  });

  it('returns 502 with failure metadata when both suppliers fail, and does not cache it', async () => {
    t.runner.failing = { supplierA: true, supplierB: true };
    const res = await request(t.app).get('/api/hotels?city=delhi');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('ALL_SUPPLIERS_FAILED');
    expect(res.body.meta).toMatchObject({ degraded: true, supplierStatus: { supplierA: 'failed', supplierB: 'failed' } });

    t.runner.failing = { supplierA: false, supplierB: false };
    const recovered = await request(t.app).get('/api/hotels?city=delhi');
    expect(recovered.status).toBe(200);
    expect(recovered.headers['x-cache']).toBe('MISS');
  });

  it('refresh updates prices in Redis without leaving stale entries', async () => {
    await request(t.app).get('/api/hotels?city=delhi');
    t.runner.failing.supplierB = true; // the refreshed dataset contains fewer hotels
    const res = await request(t.app).get('/api/hotels?city=delhi&refresh=true&minPrice=1');
    expect(res.body.meta.totalHotels).toBe(5);
    expect(await t.redis.zcard('hotel_prices:delhi')).toBe(5);
    expect(res.body.data.map((h: { name: string }) => h.name)).not.toContain('Lutyens Heritage Hotel');
  });
});

describe('GET /api/hotels/:hotelName/offers', () => {
  it('returns every supplier offer plus the best one and savings', async () => {
    const res = await request(t.app).get('/api/hotels/The%20Grand%20Palace/offers?city=delhi').expect(200);
    expect(res.body).toMatchObject({
      hotel: 'The Grand Palace',
      bestOffer: { supplier: 'Supplier B', price: 5900, commissionPct: 18 },
      savings: 600,
    });
    expect(res.body.offers.map((o: { supplier: string; price: number }) => [o.supplier, o.price])).toEqual([['Supplier B', 5900], ['Supplier A', 6500]]);
    expect(res.body.offers[1].priceDifference).toBe(600);
  });

  it('matches case/spacing variants and 404s for unknown hotels', async () => {
    await request(t.app).get('/api/hotels/%20grand%20%20PALACE/offers?city=delhi').expect(200);
    const res = await request(t.app).get('/api/hotels/Nope/offers?city=delhi');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('HOTEL_NOT_FOUND');
  });
});

describe('metrics and workflow history', () => {
  it('tracks requests, cache hits/misses, workflow executions', async () => {
    await request(t.app).get('/api/hotels?city=delhi');
    await request(t.app).get('/api/hotels?city=delhi');
    await request(t.app).get('/api/hotels?city=delhi');
    const { body } = await request(t.app).get('/api/metrics').expect(200);
    expect(body.data).toMatchObject({ totalRequests: 3, cacheHits: 2, cacheMisses: 1, workflowExecutions: 1, hotelsAggregated: 7 });
    expect(body.data.cacheHitRatio).toBeCloseTo(0.667, 2);
    expect(JSON.stringify(body)).not.toMatch(/redis:\/\/|apiKey/i);

    const runs = await request(t.app).get('/api/workflows').expect(200);
    expect(runs.body.data).toHaveLength(1);
    expect(runs.body.data[0]).toMatchObject({ city: 'delhi', status: 'COMPLETED', trigger: 'cache-miss' });
  });

  it('counts supplier failures', async () => {
    t.runner.failing.supplierA = true;
    await request(t.app).get('/api/hotels?city=delhi');
    const { body } = await request(t.app).get('/api/metrics');
    expect(body.data.supplierFailures).toBe(1);
    expect(body.data.suppliers.supplierA.successRate).toBe(0);
  });
});

describe('analytics', () => {
  it('aggregates every supported city from the cache/workflow', async () => {
    const { body } = await request(t.app).get('/api/analytics').expect(200);
    expect(body.cities).toHaveLength(6);
    expect(body.totals.hotels).toBe(body.hotels.length);
    expect(body.totals.supplierWins['Supplier A'] + body.totals.supplierWins['Supplier B']).toBe(body.totals.hotels);
    expect(body.commission).toHaveLength(2);
  });
});
