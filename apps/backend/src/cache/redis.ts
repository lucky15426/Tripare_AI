import Redis from 'ioredis';
import { logger } from '../utils/logger';

export type RedisClient = Redis;

export function createRedis(url: string): RedisClient {
  const client = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: true, lazyConnect: false });
  client.on('error', (error) => logger.error({ err: error.message }, 'redis error'));
  client.on('connect', () => logger.info('redis connected'));
  return client;
}

export async function pingRedis(redis: RedisClient): Promise<boolean> {
  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}
