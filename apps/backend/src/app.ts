import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { Container } from './container';
import { errorHandler, notFound, requestId } from './middleware';
import { createRoutes } from './routes';
import { logger } from './utils/logger';

export function createApp(container: Container): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(pinoHttp({ logger, customProps: (_req, res) => ({ requestId: res.locals.requestId }), autoLogging: { ignore: (req) => req.url === '/health' } }));
  // The SPA lives on another origin and reads API responses, so CORP must allow cross-origin use.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: container.env.CORS_ORIGIN === '*' ? true : container.env.CORS_ORIGIN.split(','),
      exposedHeaders: ['X-Cache', 'X-Workflow-Id', 'X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(createRoutes(container));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
