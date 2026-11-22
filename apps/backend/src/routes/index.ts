import { Router } from 'express';
import type { Container } from '../container';
import { createControllers } from '../controllers';
import { createSupplierRouter } from '../suppliers/simulation';
import { supplierAHotels } from '../suppliers/supplierA';
import { supplierBHotels } from '../suppliers/supplierB';

export function createRoutes(c: Container): Router {
  const { hotels, system, external, dev } = createControllers(c);
  const router = Router();

  router.get('/health', system.health!);
  // Cheap liveness probe for platform health checks (always 200 while the process is up).
  router.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Mocked external suppliers: independent of the aggregation code, reached over HTTP by activities.
  router.use('/supplierA', createSupplierRouter('Supplier A', c.simulations.supplierA, supplierAHotels));
  router.use('/supplierB', createSupplierRouter('Supplier B', c.simulations.supplierB, supplierBHotels));

  const api = Router();
  api.get('/hotels', hotels.search!);
  api.get('/hotels/:hotelName/offers', hotels.offers!);
  api.get('/cities', hotels.cities!);
  api.get('/metrics', system.metrics!);
  api.get('/workflows', system.workflows!);
  api.get('/recent-searches', system.recentSearches!);
  api.get('/suppliers', system.suppliers!);
  api.get('/analytics', system.analytics!);
  api.get('/weather', external.weather!);
  api.get('/geocode', external.geocode!);
  api.get('/currency', external.currency!);

  if (c.env.ENABLE_DEV_ENDPOINTS) {
    api.post('/dev/suppliers/reset', dev.reset!);
    api.post('/dev/suppliers/:key', dev.simulate!);
  }

  router.use('/api', api);
  return router;
}
