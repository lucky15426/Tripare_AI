import { createApp } from './app';
import { loadEnv } from './config/env';
import { createContainer } from './container';
import { startBackground, type Background } from './embedded';
import { logger } from './utils/logger';

const env = loadEnv();
const container = createContainer(env);

// Listen first so platform health checks (/healthz) pass while Temporal + the worker boot in the background.
const server = createApp(container).listen(env.PORT, () => {
  logger.info({ port: env.PORT, devEndpoints: env.ENABLE_DEV_ENDPOINTS, embeddedTemporal: env.EMBEDDED_TEMPORAL, inProcessWorker: env.EMBEDDED_TEMPORAL || env.RUN_WORKER }, 'StaySync API listening');
});

let background: Background | null = null;
startBackground(env, container.redis)
  .then((started) => {
    background = started;
  })
  .catch((error: unknown) => {
    logger.fatal({ err: error instanceof Error ? error.message : String(error) }, 'failed to start Temporal/worker');
    process.exit(1);
  });

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    void (background?.stop() ?? Promise.resolve()).finally(() => container.redis.quit().finally(() => process.exit(0)));
  });
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
