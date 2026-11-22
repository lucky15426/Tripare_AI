import { createApp } from './app';
import { loadEnv } from './config/env';
import { createContainer } from './container';
import { logger } from './utils/logger';

const env = loadEnv();
const container = createContainer(env);
const server = createApp(container).listen(env.PORT, () => {
  logger.info({ port: env.PORT, devEndpoints: env.ENABLE_DEV_ENDPOINTS }, 'StaySync API listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    container.redis.quit().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
