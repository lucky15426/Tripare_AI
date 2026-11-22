import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: { service: 'staysync' },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  transport: process.env.PRETTY_LOGS === 'true' ? { target: 'pino-pretty' } : undefined,
});
