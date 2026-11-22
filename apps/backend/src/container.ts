import { HotelCache } from './cache/hotelCache';
import { createRedis, type RedisClient } from './cache/redis';
import type { Env } from './config/env';
import { HotelSearchService } from './services/hotelSearch';
import { Telemetry } from './services/telemetry';
import { createSimulationRegistry, type SimulationRegistry } from './suppliers/simulation';
import { TemporalRunner, type WorkflowRunner } from './temporal/client';

export interface Container {
  env: Env;
  redis: RedisClient;
  cache: HotelCache;
  telemetry: Telemetry;
  runner: WorkflowRunner;
  search: HotelSearchService;
  simulations: SimulationRegistry;
}

/** Composition root. Tests override `redis` and `runner` to avoid external services. */
export function createContainer(env: Env, overrides: Partial<Pick<Container, 'redis' | 'runner'>> = {}): Container {
  const redis = overrides.redis ?? createRedis(env.REDIS_URL);
  const runner = overrides.runner ?? new TemporalRunner(env);
  const cache = new HotelCache(redis);
  const telemetry = new Telemetry(redis);
  return {
    env,
    redis,
    cache,
    telemetry,
    runner,
    search: new HotelSearchService(env, cache, runner, telemetry),
    simulations: createSimulationRegistry(env),
  };
}
