import type { RequestHandler } from 'express';
import { SUPPORTED_CITIES } from '../config/cities';
import type { Container } from '../container';
import { citySearchSchema, hotelQuerySchema, offersQuerySchema, simulationBodySchema } from '../schemas/hotels';
import { buildAnalytics } from '../services/analytics';
import { fetchCurrencyRates, fetchWeather, geocodeCity, SUPPORTED_CURRENCIES } from '../services/external';
import { buildHealth, buildSupplierStatus } from '../services/health';
import { SUPPLIERS, type SupplierKey } from '../types';
import { HttpError } from '../utils/errors';

export function createControllers(c: Container) {
  const hotels: Record<string, RequestHandler> = {
    search: async (req, res) => {
      const query = hotelQuerySchema.parse(req.query);
      const result = await c.search.search(query);
      res.setHeader('X-Cache', result.meta.cache);
      res.setHeader('X-Workflow-Id', result.meta.workflowId);
      res.json(result);
    },
    offers: async (req, res) => {
      const { city } = offersQuerySchema.parse(req.query);
      const hotelName = String(req.params.hotelName ?? '');
      const result = await c.search.offers(city, hotelName);
      res.setHeader('X-Cache', result.meta.cache);
      res.json(result);
    },
    cities: (_req, res) => {
      res.json({ data: SUPPORTED_CITIES });
    },
  };

  const system: Record<string, RequestHandler> = {
    health: async (_req, res) => {
      const health = await buildHealth(c.env, c.redis, c.runner);
      res.status(health.status === 'unhealthy' ? 503 : 200).json(health);
    },
    metrics: async (_req, res) => {
      res.json({ data: await c.telemetry.snapshot(), timestamp: new Date().toISOString() });
    },
    workflows: async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 25, 100);
      res.json({ data: await c.telemetry.workflowRuns(limit), temporalUiUrl: c.env.TEMPORAL_UI_URL });
    },
    recentSearches: async (_req, res) => {
      res.json({ data: await c.telemetry.recentSearches(10) });
    },
    suppliers: async (_req, res) => {
      res.json({ data: await buildSupplierStatus(c.env, c.telemetry), devControls: c.env.ENABLE_DEV_ENDPOINTS, timestamp: new Date().toISOString() });
    },
    analytics: async (_req, res) => {
      res.json(await buildAnalytics(c.search, c.cache));
    },
  };

  const external: Record<string, RequestHandler> = {
    weather: async (req, res) => {
      const { city } = citySearchSchema.parse(req.query);
      res.json(await fetchWeather(c.env, c.redis, city));
    },
    geocode: async (req, res) => {
      const { city } = citySearchSchema.parse(req.query);
      const result = await geocodeCity(c.env, city);
      res.json(result ? { available: true, ...result } : { available: false, city });
    },
    currency: async (_req, res) => {
      res.json({ ...(await fetchCurrencyRates(c.env, c.redis)), currencies: SUPPORTED_CURRENCIES });
    },
  };

  const dev: Record<string, RequestHandler> = {
    simulate: (req, res) => {
      const key = String(req.params.key) as SupplierKey;
      const sim = c.simulations[key];
      if (!sim) throw new HttpError(404, 'Unknown supplier. Use supplierA or supplierB.', 'UNKNOWN_SUPPLIER');
      Object.assign(sim, simulationBodySchema.parse(req.body ?? {}));
      res.json({ supplier: SUPPLIERS[key], enabled: sim.enabled, latencyMs: sim.latencyMs, errorRate: sim.errorRate });
    },
    reset: (_req, res) => {
      for (const sim of Object.values(c.simulations)) {
        sim.enabled = true;
        sim.errorRate = 0;
      }
      res.json({ restored: true });
    },
  };

  return { hotels, system, external, dev };
}
