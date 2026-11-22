import { HotelCache } from './cache/hotelCache';
import type { RedisClient } from './cache/redis';
import type { Env } from './config/env';
import { connectWithRetry, createWorker } from './temporal/worker';
import { logger } from './utils/logger';

export interface Background {
  stop: () => Promise<void>;
}

/**
 * Single-service mode. Starts, inside this process:
 *  - EMBEDDED_TEMPORAL: a real Temporal dev server (same binary @temporalio/testing downloads), history in memory
 *  - a Temporal worker (EMBEDDED_TEMPORAL or RUN_WORKER) registering the workflow and all activities
 * The HTTP server is already listening before this runs, so platform health checks pass while it boots.
 */
export async function startBackground(env: Env, redis: RedisClient, embeddedPort = 7233): Promise<Background | null> {
  if (!env.EMBEDDED_TEMPORAL && !env.RUN_WORKER) return null;

  let stopServer: () => Promise<void> = async () => undefined;
  let connection;
  if (env.EMBEDDED_TEMPORAL) {
    logger.info('starting embedded Temporal dev server (first start downloads the server binary)');
    const { TestWorkflowEnvironment } = await import('@temporalio/testing');
    const temporal = await TestWorkflowEnvironment.createLocal({ server: { ip: '127.0.0.1', port: embeddedPort } });
    env.TEMPORAL_ADDRESS = `127.0.0.1:${embeddedPort}`;
    connection = temporal.nativeConnection;
    stopServer = () => temporal.teardown();
    logger.info({ address: env.TEMPORAL_ADDRESS }, 'embedded Temporal ready');
  } else {
    connection = await connectWithRetry(env);
  }

  const worker = await createWorker({ env, cache: new HotelCache(redis), connection });
  const running = worker.run();
  logger.info({ taskQueue: env.TEMPORAL_TASK_QUEUE }, 'in-process Temporal worker started (workflows + activities registered)');

  return {
    stop: async () => {
      worker.shutdown();
      await running.catch(() => undefined);
      await stopServer();
    },
  };
}
