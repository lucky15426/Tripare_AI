import type { AggregatedHotel, CacheMeta } from '../types';
import type { RedisClient } from './redis';

/**
 * Redis layout per (normalised) city:
 *   hotels:{city}          STRING  JSON CacheMeta, TTL = cache TTL. Existence == "cache is warm".
 *   hotel_prices:{city}    ZSET    member = hotel slug, score = cheapest price
 *   hotel_details:{city}   HASH    field = hotel slug, value = JSON AggregatedHotel (incl. all offers)
 *
 * Price filtering uses ZRANGEBYSCORE on the sorted set, i.e. inside Redis.
 */
export const keys = {
  meta: (city: string) => `hotels:${city}`,
  prices: (city: string) => `hotel_prices:${city}`,
  details: (city: string) => `hotel_details:${city}`,
};

export class HotelCache {
  constructor(private readonly redis: RedisClient) {}

  /**
   * Atomically replaces the city's dataset. DEL + ZADD + HSET run inside a single
   * MULTI/EXEC, so readers never observe a half-written city and stale members
   * from a previous refresh can never survive.
   */
  async replaceCity(city: string, hotels: AggregatedHotel[], meta: CacheMeta, ttlSeconds: number): Promise<void> {
    const tx = this.redis.multi();
    tx.del(keys.prices(city), keys.details(city));
    if (hotels.length > 0) {
      const scoreMembers = hotels.flatMap((hotel) => [hotel.price, hotel.slug]);
      tx.zadd(keys.prices(city), ...scoreMembers);
      tx.hset(keys.details(city), Object.fromEntries(hotels.map((hotel) => [hotel.slug, JSON.stringify(hotel)])));
      tx.expire(keys.prices(city), ttlSeconds);
      tx.expire(keys.details(city), ttlSeconds);
    }
    tx.set(keys.meta(city), JSON.stringify(meta), 'EX', ttlSeconds);
    const results = await tx.exec();
    const failed = results?.find(([error]) => error);
    if (failed?.[0]) throw failed[0];
  }

  async getMeta(city: string): Promise<CacheMeta | null> {
    const raw = await this.redis.get(keys.meta(city));
    return raw ? (JSON.parse(raw) as CacheMeta) : null;
  }

  async ttl(city: string): Promise<number> {
    return this.redis.ttl(keys.meta(city));
  }

  /** Hotels whose cheapest price is within [min, max], selected by Redis (ZRANGEBYSCORE). */
  async queryByPrice(city: string, minPrice?: number, maxPrice?: number): Promise<AggregatedHotel[]> {
    const slugs = await this.redis.zrangebyscore(keys.prices(city), minPrice ?? '-inf', maxPrice ?? '+inf');
    if (slugs.length === 0) return [];
    const rows = await this.redis.hmget(keys.details(city), ...slugs);
    return rows.filter((row): row is string => row !== null).map((row) => JSON.parse(row) as AggregatedHotel);
  }

  async getHotel(city: string, slug: string): Promise<AggregatedHotel | null> {
    const raw = await this.redis.hget(keys.details(city), slug);
    return raw ? (JSON.parse(raw) as AggregatedHotel) : null;
  }

  async countHotels(city: string): Promise<number> {
    return this.redis.zcard(keys.prices(city));
  }

  async invalidate(city: string): Promise<void> {
    await this.redis.del(keys.meta(city), keys.prices(city), keys.details(city));
  }
}
