import { randomUUID } from 'node:crypto';
import type { HotelCache } from '../cache/hotelCache';
import type { Env } from '../config/env';
import type { HotelQuery } from '../schemas/hotels';
import { AllSuppliersFailedError, type WorkflowRunner } from '../temporal/client';
import {
  type AggregatedHotel,
  type CacheMeta,
  type HotelOfferWorkflowInput,
  type SupplierKey,
  type SupplierOutcome,
  type WorkflowRunRecord,
} from '../types';
import { HttpError } from '../utils/errors';
import { logger } from '../utils/logger';
import { normalizeHotelName } from '../utils/normalize';
import type { Telemetry } from './telemetry';

export type CacheStatus = 'HIT' | 'MISS';

export interface EnsureResult {
  cache: CacheStatus;
  meta: CacheMeta;
  workflowId: string;
}

export type PublicHotel = Omit<AggregatedHotel, 'offers'>;

export interface SearchResponse {
  data: PublicHotel[];
  meta: {
    city: string;
    totalHotels: number;
    filteredHotels: number;
    minPrice: number | null;
    maxPrice: number | null;
    cache: CacheStatus;
    refreshed: boolean;
    workflowId: string;
    degraded: boolean;
    supplierStatus: Record<SupplierKey, SupplierOutcome>;
    lastUpdated: string;
    cacheTtlSeconds: number;
    cityInfo: CacheMeta['cityInfo'];
    timestamp: string;
  };
}

const toPublic = ({ offers: _offers, ...hotel }: AggregatedHotel): PublicHotel => hotel;

export class HotelSearchService {
  /** Single-flight: concurrent misses for the same city share one workflow. */
  private readonly inflight = new Map<string, Promise<EnsureResult>>();

  constructor(
    private readonly env: Env,
    private readonly cache: HotelCache,
    private readonly runner: WorkflowRunner,
    private readonly telemetry: Telemetry,
  ) {}

  /** Returns warm cached data, or runs the Temporal workflow to (re)build it. */
  async ensureCity(city: string, refresh = false): Promise<EnsureResult> {
    if (!refresh) {
      const meta = await this.cache.getMeta(city);
      if (meta) return { cache: 'HIT', meta, workflowId: meta.workflowId };
    }
    const key = `${city}:${refresh}`;
    const running = this.inflight.get(key);
    if (running) return running;

    const promise = this.executeWorkflow(city, refresh).finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  private async executeWorkflow(city: string, refresh: boolean): Promise<EnsureResult> {
    const requestId = randomUUID();
    const workflowId = `hotel-offers-${city.replace(/[^a-z0-9]+/g, '-')}-${requestId}`;
    const input: HotelOfferWorkflowInput = {
      city,
      searchParams: {},
      requestId,
      cacheTtlSeconds: this.env.CACHE_TTL_SECONDS,
      degradedCacheTtlSeconds: this.env.DEGRADED_CACHE_TTL_SECONDS,
      options: {
        timeoutMs: this.env.SUPPLIER_TIMEOUT_MS,
        retryInitialMs: this.env.SUPPLIER_RETRY_INITIAL_MS,
        retryBackoff: this.env.SUPPLIER_RETRY_BACKOFF,
        retryMaxAttempts: this.env.SUPPLIER_RETRY_MAX_ATTEMPTS,
      },
    };
    const trigger: WorkflowRunRecord['trigger'] = refresh ? 'refresh' : 'cache-miss';
    const temporalUiUrl = `${this.env.TEMPORAL_UI_URL}/namespaces/${this.env.TEMPORAL_NAMESPACE}/workflows/${workflowId}`;
    const log = logger.child({ workflowId, city });
    log.info({ trigger }, 'starting hotelOfferWorkflow');

    try {
      const result = await this.runner.run(workflowId, input);
      await this.telemetry.recordWorkflow(
        {
          workflowId,
          city,
          status: 'COMPLETED',
          startedAt: result.startedAt,
          durationMs: result.durationMs,
          trigger,
          supplierStatus: result.supplierStatus,
          steps: result.steps,
          hotels: result.hotelCount,
          temporalUiUrl,
        },
        result.supplierDurations,
      );
      log.info({ durationMs: result.durationMs, degraded: result.degraded }, 'workflow completed');
      return { cache: 'MISS', meta: result.cacheMeta, workflowId };
    } catch (error) {
      if (error instanceof AllSuppliersFailedError) {
        const { details } = error;
        await this.telemetry.recordWorkflow(
          {
            workflowId,
            city,
            status: 'FAILED',
            startedAt: details.startedAt,
            durationMs: details.durationMs,
            trigger,
            supplierStatus: details.supplierStatus,
            steps: details.steps,
            hotels: 0,
            error: 'All suppliers failed',
            temporalUiUrl,
          },
          {},
        );
        log.error({ errors: details.supplierErrors }, 'all suppliers failed');
        throw new HttpError(502, 'All hotel suppliers are currently unavailable. Please try again shortly.', 'ALL_SUPPLIERS_FAILED', {
          city,
          workflowId,
          degraded: true,
          supplierStatus: details.supplierStatus,
        });
      }
      log.error({ err: (error as Error).message }, 'workflow execution failed');
      throw new HttpError(503, 'Hotel aggregation is temporarily unavailable.', 'WORKFLOW_UNAVAILABLE', { city, workflowId });
    }
  }

  async search(query: HotelQuery): Promise<SearchResponse> {
    const { city, minPrice, maxPrice } = query;
    const ensured = await this.ensureCity(city, query.refresh);

    // Price filtering happens inside Redis (ZRANGEBYSCORE on the price sorted set).
    let hotels = await this.cache.queryByPrice(city, minPrice, maxPrice);

    if (query.supplier) hotels = hotels.filter((hotel) => hotel.supplier === query.supplier);
    if (query.minRating !== undefined) hotels = hotels.filter((hotel) => (hotel.rating ?? 0) >= (query.minRating ?? 0));
    if (query.q) {
      const needle = normalizeHotelName(query.q);
      hotels = hotels.filter((hotel) => hotel.slug.includes(needle));
    }

    const direction = query.sortOrder === 'desc' ? -1 : 1;
    const metric = (hotel: AggregatedHotel): number =>
      query.sortBy === 'rating' ? (hotel.rating ?? -1) : query.sortBy === 'commission' ? hotel.commissionPct : hotel.price;
    hotels.sort((a, b) => direction * (metric(a) - metric(b)) || a.price - b.price || a.slug.localeCompare(b.slug));

    await Promise.all([
      this.telemetry.recordRequest(ensured.cache === 'HIT'),
      this.telemetry.recordSearch({ city, cache: ensured.cache, results: hotels.length, at: new Date().toISOString() }),
    ]);

    return {
      data: hotels.map(toPublic),
      meta: {
        city,
        totalHotels: ensured.meta.totalHotels,
        filteredHotels: hotels.length,
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null,
        cache: ensured.cache,
        refreshed: query.refresh,
        workflowId: ensured.workflowId,
        degraded: ensured.meta.degraded,
        supplierStatus: ensured.meta.supplierStatus,
        lastUpdated: ensured.meta.lastUpdated,
        cacheTtlSeconds: Math.max(await this.cache.ttl(city), 0),
        cityInfo: ensured.meta.cityInfo,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** All supplier offers for one hotel, not just the winner. */
  async offers(city: string, hotelName: string) {
    const ensured = await this.ensureCity(city);
    const hotel = await this.cache.getHotel(city, normalizeHotelName(hotelName));
    if (!hotel) throw new HttpError(404, `No hotel matching "${hotelName}" found in ${city}`, 'HOTEL_NOT_FOUND');

    const best = hotel.offers[0];
    return {
      hotel: hotel.name,
      city,
      offers: hotel.offers.map((offer) => ({ ...offer, priceDifference: offer.price - hotel.price, isBest: offer.supplier === hotel.supplier })),
      bestOffer: best ? { supplier: best.supplier, price: best.price, commissionPct: best.commissionPct } : null,
      savings: hotel.savings,
      meta: { cache: ensured.cache, workflowId: ensured.workflowId, degraded: ensured.meta.degraded, timestamp: new Date().toISOString() },
    };
  }
}
