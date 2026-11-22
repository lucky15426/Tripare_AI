import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  DEGRADED_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),

  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  TEMPORAL_TASK_QUEUE: z.string().default('hotel-offers'),
  // Temporal Cloud / secured clusters: set TEMPORAL_TLS=true and (for API-key auth) TEMPORAL_API_KEY.
  TEMPORAL_TLS: bool.default(false),
  TEMPORAL_API_KEY: z.string().optional(),
  TEMPORAL_UI_URL: z.string().default('http://localhost:8080'),

  // Supplier clients call suppliers over HTTP, like any external service.
  SUPPLIER_A_URL: z.string().default('http://localhost:4000/supplierA'),
  SUPPLIER_B_URL: z.string().default('http://localhost:4000/supplierB'),
  SUPPLIER_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  SUPPLIER_RETRY_INITIAL_MS: z.coerce.number().int().positive().default(500),
  SUPPLIER_RETRY_BACKOFF: z.coerce.number().positive().default(2),
  SUPPLIER_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  WORKFLOW_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // Mock supplier simulation (initial state; can be changed at runtime in dev).
  SUPPLIER_A_ENABLED: bool.default(true),
  SUPPLIER_B_ENABLED: bool.default(true),
  SUPPLIER_A_LATENCY_MS: z.coerce.number().int().min(0).default(250),
  SUPPLIER_B_LATENCY_MS: z.coerce.number().int().min(0).default(550),
  SUPPLIER_A_ERROR_RATE: z.coerce.number().min(0).max(1).default(0),
  SUPPLIER_B_ERROR_RATE: z.coerce.number().min(0).max(1).default(0),
  ENABLE_DEV_ENDPOINTS: bool.optional(),

  OPENWEATHER_API_KEY: z.string().optional(),
  GEOAPIFY_API_KEY: z.string().optional(),
  FRANKFURTER_URL: z.string().default('https://api.frankfurter.app'),
});

export type Env = Omit<z.infer<typeof schema>, 'ENABLE_DEV_ENDPOINTS'> & { ENABLE_DEV_ENDPOINTS: boolean };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Treat empty strings (e.g. unset docker-compose vars) as undefined.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ''));
  const parsed = schema.parse(cleaned);
  return { ...parsed, ENABLE_DEV_ENDPOINTS: parsed.ENABLE_DEV_ENDPOINTS ?? parsed.NODE_ENV !== 'production' };
}
