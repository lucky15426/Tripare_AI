export type SupplierKey = 'supplierA' | 'supplierB';
export type SupplierName = 'Supplier A' | 'Supplier B';
export type SupplierOutcome = 'success' | 'failed';

export const SUPPLIERS: Record<SupplierKey, SupplierName> = {
  supplierA: 'Supplier A',
  supplierB: 'Supplier B',
};

/** Shape returned by a supplier's HTTP API. */
export interface RawSupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
  rating: number;
  latitude: number;
  longitude: number;
  description?: string;
}

/** A single supplier's offer after validation + normalisation. */
export interface Offer {
  supplier: SupplierName;
  hotelId: string;
  name: string;
  normalizedName: string;
  city: string;
  price: number;
  commissionPct: number;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
}

export interface OfferSummary {
  supplier: SupplierName;
  hotelId: string;
  price: number;
  commissionPct: number;
  rating: number | null;
  description: string | null;
}

/** One hotel after deduplication; the winning offer's fields are at the top level. */
export interface AggregatedHotel {
  hotelId: string;
  slug: string;
  name: string;
  city: string;
  price: number;
  supplier: SupplierName;
  commissionPct: number;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  originalPrice: number;
  savings: number;
  priceDifference: number;
  competingOffers: number;
  lastUpdated: string;
  offers: OfferSummary[];
}

export interface NormalizeResult {
  offers: Offer[];
  rejected: { supplier: SupplierName; hotelId: string; reason: string }[];
}

// ---- Workflow contract ----------------------------------------------------

export interface ResilienceOptions {
  timeoutMs: number;
  retryInitialMs: number;
  retryBackoff: number;
  retryMaxAttempts: number;
}

export interface HotelOfferWorkflowInput {
  city: string;
  searchParams: { minPrice?: number; maxPrice?: number; supplier?: string };
  requestId: string;
  options: ResilienceOptions;
  cacheTtlSeconds: number;
  degradedCacheTtlSeconds: number;
}

export interface SupplierFetchResult {
  supplier: SupplierName;
  hotels: RawSupplierHotel[];
  durationMs: number;
  attempt: number;
}

export interface CityEnrichment {
  city: string;
  latitude: number;
  longitude: number;
  source: 'geoapify' | 'builtin';
}

export interface WorkflowStep {
  name: 'supplierA' | 'supplierB' | 'normalize' | 'aggregate' | 'saveToRedis' | 'enrichCity';
  status: 'success' | 'failed' | 'skipped';
  /** Offset from workflow start, in ms (deterministic workflow clock). */
  startOffsetMs: number;
  durationMs: number;
  attempts?: number;
  error?: string;
}

export interface CacheMeta {
  city: string;
  totalHotels: number;
  lastUpdated: string;
  workflowId: string;
  supplierStatus: Record<SupplierKey, SupplierOutcome>;
  degraded: boolean;
  cityInfo: CityEnrichment | null;
}

export interface HotelOfferWorkflowResult {
  workflowId: string;
  city: string;
  hotelCount: number;
  supplierStatus: Record<SupplierKey, SupplierOutcome>;
  supplierDurations: Partial<Record<SupplierKey, number>>;
  supplierAttempts: Partial<Record<SupplierKey, number>>;
  supplierErrors: Partial<Record<SupplierKey, string>>;
  rejectedOffers: number;
  degraded: boolean;
  steps: WorkflowStep[];
  startedAt: string;
  durationMs: number;
  cacheMeta: CacheMeta;
}

export interface WorkflowRunRecord {
  workflowId: string;
  city: string;
  status: 'COMPLETED' | 'FAILED';
  startedAt: string;
  durationMs: number;
  trigger: 'cache-miss' | 'refresh';
  supplierStatus: Record<SupplierKey, SupplierOutcome> | null;
  steps: WorkflowStep[];
  hotels: number;
  error?: string;
  temporalUiUrl: string;
}
