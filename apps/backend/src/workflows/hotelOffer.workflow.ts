import { ActivityFailure, ApplicationFailure, proxyActivities, workflowInfo } from '@temporalio/workflow';
import type { Activities } from '../activities';
import type {
  CityEnrichment,
  HotelOfferWorkflowInput,
  HotelOfferWorkflowResult,
  SupplierFetchResult,
  SupplierKey,
  SupplierOutcome,
  WorkflowStep,
} from '../types';

/*
 * DETERMINISTIC workflow code: no HTTP, no Redis, no Math.random, no process.env.
 * Date.now() is safe here (Temporal replaces it with the deterministic workflow clock).
 * All configuration arrives through `input`; all I/O happens in activities.
 */

type SupplierAttempt =
  | { key: SupplierKey; ok: true; result: SupplierFetchResult; offset: number; elapsed: number }
  | { key: SupplierKey; ok: false; error: string; attempts: number; offset: number; elapsed: number };

const errorMessage = (error: unknown): string =>
  error instanceof ActivityFailure
    ? (error.cause?.message ?? error.message)
    : error instanceof Error
      ? error.message
      : String(error);

export async function hotelOfferWorkflow(input: HotelOfferWorkflowInput): Promise<HotelOfferWorkflowResult> {
  const { workflowId } = workflowInfo();
  const { city, options } = input;
  const startedMs = Date.now();
  const startedAt = new Date(startedMs).toISOString();
  const steps: WorkflowStep[] = [];
  const offset = () => Date.now() - startedMs;

  // Supplier activities: bounded timeout + exponential-backoff retries, never infinite.
  const supplierActivities = proxyActivities<Activities>({
    startToCloseTimeout: options.timeoutMs + 500,
    retry: {
      initialInterval: options.retryInitialMs,
      backoffCoefficient: options.retryBackoff,
      maximumAttempts: options.retryMaxAttempts,
    },
  });
  const internalActivities = proxyActivities<Activities>({
    startToCloseTimeout: '15 seconds',
    retry: { initialInterval: '500 milliseconds', backoffCoefficient: 2, maximumAttempts: 3 },
  });
  const enrichmentActivities = proxyActivities<Activities>({
    startToCloseTimeout: '5 seconds',
    retry: { maximumAttempts: 1 }, // optional enrichment: never worth retrying
  });

  const callSupplier = async (key: SupplierKey): Promise<SupplierAttempt> => {
    const startOffset = offset();
    try {
      const result =
        key === 'supplierA'
          ? await supplierActivities.fetchSupplierA(city, options.timeoutMs)
          : await supplierActivities.fetchSupplierB(city, options.timeoutMs);
      return { key, ok: true, result, offset: startOffset, elapsed: offset() - startOffset };
    } catch (error) {
      // One supplier failing must never fail the other: capture and continue.
      const exhausted = error instanceof ActivityFailure && error.retryState === 'MAXIMUM_ATTEMPTS_REACHED';
      return {
        key,
        ok: false,
        error: errorMessage(error),
        attempts: exhausted ? options.retryMaxAttempts : 1,
        offset: startOffset,
        elapsed: offset() - startOffset,
      };
    }
  };

  const enrich = async (): Promise<{ info: CityEnrichment | null; step: WorkflowStep }> => {
    const startOffset = offset();
    try {
      const info = await enrichmentActivities.enrichCity(city);
      return { info, step: { name: 'enrichCity', status: 'success', startOffsetMs: startOffset, durationMs: offset() - startOffset } };
    } catch (error) {
      return { info: null, step: { name: 'enrichCity', status: 'failed', startOffsetMs: startOffset, durationMs: offset() - startOffset, error: errorMessage(error) } };
    }
  };

  // 1. Fan out: both suppliers + optional enrichment run concurrently.
  const [attemptA, attemptB, enrichment] = await Promise.all([callSupplier('supplierA'), callSupplier('supplierB'), enrich()]);
  const attempts = [attemptA, attemptB];

  const supplierStatus = {} as Record<SupplierKey, SupplierOutcome>;
  const supplierDurations: HotelOfferWorkflowResult['supplierDurations'] = {};
  const supplierAttempts: HotelOfferWorkflowResult['supplierAttempts'] = {};
  const supplierErrors: HotelOfferWorkflowResult['supplierErrors'] = {};
  for (const attempt of attempts) {
    supplierStatus[attempt.key] = attempt.ok ? 'success' : 'failed';
    if (attempt.ok) {
      supplierDurations[attempt.key] = attempt.result.durationMs;
      supplierAttempts[attempt.key] = attempt.result.attempt;
    } else {
      supplierErrors[attempt.key] = attempt.error;
      supplierAttempts[attempt.key] = attempt.attempts;
    }
    steps.push({
      name: attempt.key,
      status: attempt.ok ? 'success' : 'failed',
      startOffsetMs: attempt.offset,
      durationMs: attempt.elapsed,
      attempts: attempt.ok ? attempt.result.attempt : attempt.attempts,
      error: attempt.ok ? undefined : attempt.error,
    });
  }
  steps.push(enrichment.step);

  const degraded = attempts.some((attempt) => !attempt.ok);
  const succeeded = attempts.filter((a): a is Extract<SupplierAttempt, { ok: true }> => a.ok).map((a) => a.result);

  // 2. Both suppliers down: surface a real workflow failure carrying the diagnostics.
  if (succeeded.length === 0) {
    throw ApplicationFailure.nonRetryable('All suppliers failed', 'ALL_SUPPLIERS_FAILED', {
      supplierStatus,
      supplierErrors,
      supplierAttempts,
      steps,
      startedAt,
      durationMs: offset(),
    });
  }

  // 3. Normalize -> aggregate -> persist.
  const timed = async <T>(name: WorkflowStep['name'], run: () => Promise<T>): Promise<T> => {
    const startOffset = offset();
    try {
      const value = await run();
      steps.push({ name, status: 'success', startOffsetMs: startOffset, durationMs: offset() - startOffset });
      return value;
    } catch (error) {
      steps.push({ name, status: 'failed', startOffsetMs: startOffset, durationMs: offset() - startOffset, error: errorMessage(error) });
      throw error;
    }
  };

  const normalized = await timed('normalize', () => internalActivities.normalizeOffers(succeeded));
  const lastUpdated = new Date(Date.now()).toISOString();
  const hotels = await timed('aggregate', () => internalActivities.aggregateOffers(normalized.offers, city, lastUpdated));

  const cacheMeta = {
    city,
    totalHotels: hotels.length,
    lastUpdated,
    workflowId,
    supplierStatus,
    degraded,
    cityInfo: enrichment.info,
  };
  const ttl = degraded ? input.degradedCacheTtlSeconds : input.cacheTtlSeconds;
  await timed('saveToRedis', () => internalActivities.saveToRedis(city, hotels, cacheMeta, ttl));

  return {
    workflowId,
    city,
    hotelCount: hotels.length,
    supplierStatus,
    supplierDurations,
    supplierAttempts,
    supplierErrors,
    rejectedOffers: normalized.rejected.length,
    degraded,
    steps,
    startedAt,
    durationMs: offset(),
    cacheMeta,
  };
}
