/**
 * VERIFICATION HARNESS (not used by Docker / production).
 *
 * Boots the complete backend in one process on the host: a real Temporal dev server (:7233), the real worker,
 * and the real Express API (:4000). The ONLY substitute is Redis, replaced by an in-memory mock because this
 * machine had no Redis server. Used to run the Postman collection (newman) and the frontend against real HTTP.
 *
 *   npx tsx scripts/verify-stack.ts
 */
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import path from 'node:path';
import RedisMock from 'ioredis-mock';
import { createActivities } from '../src/activities';
import { createApp } from '../src/app';
import { HotelCache } from '../src/cache/hotelCache';
import type { RedisClient } from '../src/cache/redis';
import { loadEnv } from '../src/config/env';
import { createContainer } from '../src/container';

async function main() {
  const env = loadEnv({ ...process.env, NODE_ENV: 'development', PORT: '4000', TEMPORAL_ADDRESS: '127.0.0.1:7233', LOG_LEVEL: 'warn' });
  const temporal = await TestWorkflowEnvironment.createLocal({ server: { ip: '127.0.0.1', port: 7233 } });
  const redis = new RedisMock() as unknown as RedisClient;
  const container = createContainer(env, { redis });
  const worker = await Worker.create({
    connection: temporal.nativeConnection,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowsPath: path.join(__dirname, '../src/workflows/index.ts'),
    activities: createActivities({ env, cache: new HotelCache(redis) }),
  });
  const workerRun = worker.run();
  const server = createApp(container).listen(env.PORT, () => console.log(`VERIFY STACK READY: api :${env.PORT}, temporal :7233`));

  const stop = async () => {
    server.close();
    worker.shutdown();
    await workerRun;
    await temporal.teardown();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
