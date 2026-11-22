import { ApplicationFailure, Context } from '@temporalio/activity';
import { z } from 'zod';
import type { HotelCache } from '../cache/hotelCache';
import type { Env } from '../config/env';
import { aggregateOffers, normalizeSupplierOffers } from '../services/offers';
import { geocodeCity } from '../services/external';
import {
  SUPPLIERS,
  type AggregatedHotel,
  type CacheMeta,
  type CityEnrichment,
  type NormalizeResult,
  type Offer,
  type SupplierFetchResult,
  type SupplierKey,
} from '../types';
import { logger } from '../utils/logger';

const supplierPayload = z.array(z.unknown());

export interface ActivityDeps {
  env: Env;
  cache: HotelCache;
}

/**
 * Temporal activities: ALL I/O (HTTP, Redis) lives here, never in workflow code.
 * Factory form so dependencies (env, Redis) are injected by the worker.
 */
export function createActivities({ env, cache }: ActivityDeps) {
  async function fetchSupplier(key: SupplierKey, baseUrl: string, city: string, timeoutMs: number): Promise<SupplierFetchResult> {
    const supplier = SUPPLIERS[key];
    const { attempt, workflowExecution } = Context.current().info;
    const workflowId = workflowExecution?.workflowId;
    const started = Date.now();
    const log = logger.child({ activity: `fetch${key === 'supplierA' ? 'SupplierA' : 'SupplierB'}`, workflowId, attempt, city });
    log.info('fetching supplier');

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/hotels?city=${encodeURIComponent(city)}`, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      log.warn({ err: (error as Error).message }, 'supplier request failed (will retry per policy)');
      throw ApplicationFailure.retryable(`${supplier} request failed: ${(error as Error).message}`, 'SUPPLIER_UNREACHABLE');
    }

    if (!response.ok) {
      const message = `${supplier} responded with HTTP ${response.status}`;
      log.warn({ status: response.status }, message);
      // 4xx will not get better by retrying; 5xx might.
      if (response.status >= 400 && response.status < 500) throw ApplicationFailure.nonRetryable(message, 'SUPPLIER_BAD_REQUEST');
      throw ApplicationFailure.retryable(message, 'SUPPLIER_ERROR');
    }

    const parsed = supplierPayload.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      log.error('supplier returned a malformed payload');
      throw ApplicationFailure.nonRetryable(`${supplier} returned a malformed payload`, 'SUPPLIER_MALFORMED');
    }

    const durationMs = Date.now() - started;
    log.info({ hotels: parsed.data.length, durationMs }, 'supplier fetched');
    return { supplier, hotels: parsed.data as SupplierFetchResult['hotels'], durationMs, attempt };
  }

  return {
    fetchSupplierA: (city: string, timeoutMs: number) => fetchSupplier('supplierA', env.SUPPLIER_A_URL, city, timeoutMs),
    fetchSupplierB: (city: string, timeoutMs: number) => fetchSupplier('supplierB', env.SUPPLIER_B_URL, city, timeoutMs),

    async normalizeOffers(responses: SupplierFetchResult[]): Promise<NormalizeResult> {
      const merged: NormalizeResult = { offers: [], rejected: [] };
      for (const response of responses) {
        const result = normalizeSupplierOffers(response.supplier, response.hotels);
        merged.offers.push(...result.offers);
        merged.rejected.push(...result.rejected);
      }
      logger.info({ offers: merged.offers.length, rejected: merged.rejected.length }, 'offers normalized');
      return merged;
    },

    async aggregateOffers(offers: Offer[], city: string, lastUpdated: string): Promise<AggregatedHotel[]> {
      const hotels = aggregateOffers(offers, city, lastUpdated);
      logger.info({ city, offers: offers.length, hotels: hotels.length }, 'offers aggregated');
      return hotels;
    },

    async saveToRedis(city: string, hotels: AggregatedHotel[], meta: CacheMeta, ttlSeconds: number): Promise<number> {
      await cache.replaceCity(city, hotels, meta, ttlSeconds);
      logger.info({ city, hotels: hotels.length, ttlSeconds }, 'aggregated hotels saved to redis');
      return hotels.length;
    },

    async enrichCity(city: string): Promise<CityEnrichment | null> {
      return geocodeCity(env, city);
    },
  };
}

export type Activities = ReturnType<typeof createActivities>;
