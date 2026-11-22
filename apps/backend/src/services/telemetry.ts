import type { RedisClient } from '../cache/redis';
import type { SupplierKey, WorkflowRunRecord } from '../types';

const METRICS_KEY = 'metrics';
const RUNS_KEY = 'workflow_runs';
const RECENT_KEY = 'recent_searches';
const SUPPLIER_KEYS: SupplierKey[] = ['supplierA', 'supplierB'];

export interface RecentSearch {
  city: string;
  cache: 'HIT' | 'MISS';
  results: number;
  at: string;
}

export interface SupplierMetrics {
  requests: number;
  failures: number;
  successRate: number | null;
  avgResponseMs: number | null;
}

export interface MetricsSnapshot {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number | null;
  workflowExecutions: number;
  workflowFailures: number;
  supplierFailures: number;
  avgSupplierResponseMs: number | null;
  avgWorkflowDurationMs: number | null;
  hotelsAggregated: number;
  lastRefresh: string | null;
  suppliers: Record<SupplierKey, SupplierMetrics>;
}

const ratio = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 1000 : null);

/** Application metrics, workflow run history and recent searches, persisted in Redis so API and worker restarts keep them. */
export class Telemetry {
  constructor(private readonly redis: RedisClient) {}

  private async safe(work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch {
      /* telemetry must never break a request */
    }
  }

  recordRequest(hit: boolean): Promise<void> {
    return this.safe(() => this.redis.multi().hincrby(METRICS_KEY, 'totalRequests', 1).hincrby(METRICS_KEY, hit ? 'cacheHits' : 'cacheMisses', 1).exec());
  }

  recordSearch(search: RecentSearch): Promise<void> {
    return this.safe(() => this.redis.multi().lpush(RECENT_KEY, JSON.stringify(search)).ltrim(RECENT_KEY, 0, 49).exec());
  }

  /** Records a finished (or failed) workflow execution and its per-supplier outcomes. */
  recordWorkflow(run: WorkflowRunRecord, supplierDurations: Partial<Record<SupplierKey, number>>): Promise<void> {
    return this.safe(async () => {
      const tx = this.redis.multi();
      tx.hincrby(METRICS_KEY, 'workflowExecutions', 1);
      tx.hincrby(METRICS_KEY, 'workflowDurationMsSum', run.durationMs);
      if (run.status === 'FAILED') tx.hincrby(METRICS_KEY, 'workflowFailures', 1);
      if (run.status === 'COMPLETED') {
        tx.hset(METRICS_KEY, 'hotelsAggregated', run.hotels, 'lastRefresh', run.startedAt);
      }
      for (const key of SUPPLIER_KEYS) {
        const outcome = run.supplierStatus?.[key];
        if (!outcome) continue;
        tx.hincrby(METRICS_KEY, `${key}_requests`, 1);
        if (outcome === 'failed') tx.hincrby(METRICS_KEY, `${key}_failures`, 1);
        const duration = supplierDurations[key];
        if (duration !== undefined) {
          tx.hincrby(METRICS_KEY, `${key}_msSum`, duration);
          tx.hincrby(METRICS_KEY, `${key}_msCount`, 1);
        }
      }
      tx.lpush(RUNS_KEY, JSON.stringify(run)).ltrim(RUNS_KEY, 0, 99);
      await tx.exec();
    });
  }

  async recentSearches(limit = 10): Promise<RecentSearch[]> {
    const rows = await this.redis.lrange(RECENT_KEY, 0, limit - 1);
    return rows.map((row) => JSON.parse(row) as RecentSearch);
  }

  async workflowRuns(limit = 25): Promise<WorkflowRunRecord[]> {
    const rows = await this.redis.lrange(RUNS_KEY, 0, limit - 1);
    return rows.map((row) => JSON.parse(row) as WorkflowRunRecord);
  }

  async snapshot(): Promise<MetricsSnapshot> {
    const raw = await this.redis.hgetall(METRICS_KEY);
    const n = (field: string) => Number(raw[field] ?? 0);

    const suppliers = {} as Record<SupplierKey, SupplierMetrics>;
    for (const key of SUPPLIER_KEYS) {
      const requests = n(`${key}_requests`);
      const failures = n(`${key}_failures`);
      suppliers[key] = {
        requests,
        failures,
        successRate: ratio(requests - failures, requests),
        avgResponseMs: n(`${key}_msCount`) > 0 ? Math.round(n(`${key}_msSum`) / n(`${key}_msCount`)) : null,
      };
    }
    const msCount = n('supplierA_msCount') + n('supplierB_msCount');
    const hits = n('cacheHits');
    const misses = n('cacheMisses');
    return {
      totalRequests: n('totalRequests'),
      cacheHits: hits,
      cacheMisses: misses,
      cacheHitRatio: ratio(hits, hits + misses),
      workflowExecutions: n('workflowExecutions'),
      workflowFailures: n('workflowFailures'),
      supplierFailures: suppliers.supplierA.failures + suppliers.supplierB.failures,
      avgSupplierResponseMs: msCount > 0 ? Math.round((n('supplierA_msSum') + n('supplierB_msSum')) / msCount) : null,
      avgWorkflowDurationMs: n('workflowExecutions') > 0 ? Math.round(n('workflowDurationMsSum') / n('workflowExecutions')) : null,
      hotelsAggregated: n('hotelsAggregated'),
      lastRefresh: raw.lastRefresh ?? null,
      suppliers,
    };
  }
}
