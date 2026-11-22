import { HotelCache } from './cache/hotelCache';
import { createRedis } from './cache/redis';
import { loadEnv } from './config/env';
import { connectWithRetry, createWorker } from './temporal/worker';
import { logger } from './utils/logger';

async function main() {
  const env = loadEnv();
  const redis = createRedis(env.REDIS_URL);
  const connection = await connectWithRetry(env);
  const worker = await createWorker({ env, cache: new HotelCache(redis), connection });
  logger.info({ taskQueue: env.TEMPORAL_TASK_QUEUE, namespace: env.TEMPORAL_NAMESPACE }, 'temporal worker started (workflows + activities registered)');

  const stop = () => worker.shutdown();
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  await worker.run();
  await connection.close();
  await redis.quit();
}

main().catch((error) => {
  logger.fatal({ err: error instanceof Error ? error.message : String(error) }, 'worker crashed');
  process.exit(1);
});
