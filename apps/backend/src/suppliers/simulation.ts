import { Router } from 'express';
import type { Env } from '../config/env';
import type { RawSupplierHotel, SupplierKey } from '../types';
import { normalizeCity } from '../utils/normalize';

/**
 * Runtime behaviour knobs for a mocked supplier. This module only simulates an
 * external HTTP service (latency / errors / outages); it contains NO aggregation logic.
 */
export interface SupplierSimulation {
  enabled: boolean;
  latencyMs: number;
  errorRate: number;
  requests: number;
  failures: number;
}

export type SimulationRegistry = Record<SupplierKey, SupplierSimulation>;

export function createSimulationRegistry(env: Env): SimulationRegistry {
  return {
    supplierA: { enabled: env.SUPPLIER_A_ENABLED, latencyMs: env.SUPPLIER_A_LATENCY_MS, errorRate: env.SUPPLIER_A_ERROR_RATE, requests: 0, failures: 0 },
    supplierB: { enabled: env.SUPPLIER_B_ENABLED, latencyMs: env.SUPPLIER_B_LATENCY_MS, errorRate: env.SUPPLIER_B_ERROR_RATE, requests: 0, failures: 0 },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Builds the Express router that behaves like a standalone supplier API. */
export function createSupplierRouter(
  label: string,
  sim: SupplierSimulation,
  catalogue: RawSupplierHotel[],
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    if (!sim.enabled) {
      res.status(503).json({ status: 'unavailable', supplier: label, requests: sim.requests, failures: sim.failures });
      return;
    }
    res.json({ status: 'healthy', supplier: label, requests: sim.requests, failures: sim.failures });
  });

  router.get('/hotels', async (req, res) => {
    sim.requests += 1;
    const rawCity = typeof req.query.city === 'string' ? req.query.city : '';
    if (!rawCity.trim()) {
      res.status(400).json({ error: 'city query parameter is required' });
      return;
    }

    const jitter = sim.latencyMs * (0.8 + Math.random() * 0.4);
    await sleep(jitter);

    if (!sim.enabled) {
      sim.failures += 1;
      res.status(503).json({ error: `${label} is currently unavailable` });
      return;
    }
    if (sim.errorRate > 0 && Math.random() < sim.errorRate) {
      sim.failures += 1;
      res.status(500).json({ error: `${label} simulated internal error` });
      return;
    }

    const city = normalizeCity(rawCity);
    res.json(catalogue.filter((hotel) => hotel.city === city));
  });

  return router;
}
