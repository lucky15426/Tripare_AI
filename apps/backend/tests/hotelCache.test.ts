import RedisMock from 'ioredis-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { HotelCache, keys } from '../src/cache/hotelCache';
import type { RedisClient } from '../src/cache/redis';
import type { AggregatedHotel, CacheMeta } from '../src/types';

const hotel = (slug: string, price: number): AggregatedHotel => ({
  hotelId: slug, slug, name: slug, city: 'delhi', price, supplier: 'Supplier A', commissionPct: 10, rating: 4,
  latitude: 1, longitude: 2, description: null, originalPrice: price, savings: 0, priceDifference: 0, competingOffers: 1,
  lastUpdated: 'now', offers: [],
});
const meta = (n: number): CacheMeta => ({
  city: 'delhi', totalHotels: n, lastUpdated: 'now', workflowId: 'wf', degraded: false, cityInfo: null,
  supplierStatus: { supplierA: 'success', supplierB: 'success' },
});

describe('HotelCache (Redis sorted-set price index)', () => {
  let redis: RedisClient;
  let cache: HotelCache;
  beforeEach(async () => {
    redis = new RedisMock() as unknown as RedisClient;
    await redis.flushall();
    cache = new HotelCache(redis);
  });

  const seed = () => cache.replaceCity('delhi', [hotel('a', 1000), hotel('b', 3000), hotel('c', 5000), hotel('d', 8000), hotel('e', 12000)], meta(5), 300);

  it('returns hotels via ZRANGEBYSCORE for min, max, both and neither', async () => {
    await seed();
    const slugs = async (min?: number, max?: number) => (await cache.queryByPrice('delhi', min, max)).map((h) => h.slug);
    expect(await slugs()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(await slugs(3000, 8000)).toEqual(['b', 'c', 'd']); // inclusive bounds
    expect(await slugs(5001)).toEqual(['d', 'e']);
    expect(await slugs(undefined, 3000)).toEqual(['a', 'b']);
    expect(await slugs(9000, 9500)).toEqual([]);
  });

  it('uses a sorted set whose scores are the prices, with details stored in a hash', async () => {
    await seed();
    expect(await redis.zscore(keys.prices('delhi'), 'c')).toBe('5000');
    expect(await redis.hlen(keys.details('delhi'))).toBe(5);
    expect(await redis.ttl(keys.meta('delhi'))).toBeGreaterThan(0);
    expect(await redis.ttl(keys.prices('delhi'))).toBeGreaterThan(0);
  });

  it('removes stale members and updates changed prices on refresh', async () => {
    await seed();
    await cache.replaceCity('delhi', [hotel('a', 1500), hotel('z', 2000)], meta(2), 300);
    const all = await cache.queryByPrice('delhi');
    expect(all.map((h) => [h.slug, h.price])).toEqual([['a', 1500], ['z', 2000]]);
    expect(await redis.zcard(keys.prices('delhi'))).toBe(2);
    expect(await redis.hlen(keys.details('delhi'))).toBe(2);
    expect(await cache.getHotel('delhi', 'b')).toBeNull();
  });

  it('clears everything when a refresh returns no hotels', async () => {
    await seed();
    await cache.replaceCity('delhi', [], meta(0), 300);
    expect(await cache.queryByPrice('delhi')).toEqual([]);
    expect((await cache.getMeta('delhi'))?.totalHotels).toBe(0);
  });

  it('reports a miss when nothing is cached', async () => {
    expect(await cache.getMeta('delhi')).toBeNull();
  });
});
