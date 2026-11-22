import { pingRedis, type RedisClient } from '../cache/redis';
import type { Env } from '../config/env';
import type { WorkflowRunner } from '../temporal/client';
import type { SupplierKey } from '../types';
import type { Telemetry } from './telemetry';

export type ServiceState = 'healthy' | 'unhealthy';

export interface SupplierHealth {
  key: SupplierKey;
  name: string;
  status: ServiceState;
  responseTimeMs: number | null;
  lastChecked: string;
}

async function probeSupplier(key: SupplierKey, name: string, baseUrl: string): Promise<SupplierHealth> {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    return { key, name, status: response.ok ? 'healthy' : 'unhealthy', responseTimeMs: Date.now() - started, lastChecked: new Date().toISOString() };
  } catch {
    return { key, name, status: 'unhealthy', responseTimeMs: null, lastChecked: new Date().toISOString() };
  }
}

export const probeSuppliers = (env: Env): Promise<SupplierHealth[]> =>
  Promise.all([
    probeSupplier('supplierA', 'Supplier A', env.SUPPLIER_A_URL),
    probeSupplier('supplierB', 'Supplier B', env.SUPPLIER_B_URL),
  ]);

export async function buildHealth(env: Env, redis: RedisClient, runner: WorkflowRunner) {
  const [redisOk, temporalOk, suppliers] = await Promise.all([pingRedis(redis), runner.ping(), probeSuppliers(env)]);
  const state = (ok: boolean): ServiceState => (ok ? 'healthy' : 'unhealthy');
  const [supplierA, supplierB] = suppliers;

  const services = {
    api: 'healthy' as ServiceState,
    redis: state(redisOk),
    temporal: state(temporalOk),
    supplierA: supplierA?.status ?? 'unhealthy',
    supplierB: supplierB?.status ?? 'unhealthy',
  };
  // Redis or Temporal down => cannot serve (unhealthy). A supplier down => still serving (degraded).
  const status = !redisOk || !temporalOk ? 'unhealthy' : suppliers.some((s) => s.status !== 'healthy') ? 'degraded' : 'healthy';
  return { status, timestamp: new Date().toISOString(), services };
}

export async function buildSupplierStatus(env: Env, telemetry: Telemetry) {
  const [health, metrics] = await Promise.all([probeSuppliers(env), telemetry.snapshot()]);
  return health.map((supplier) => ({ ...supplier, ...metrics.suppliers[supplier.key] }));
}
