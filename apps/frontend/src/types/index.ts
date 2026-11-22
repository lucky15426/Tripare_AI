export type SupplierName = 'Supplier A' | 'Supplier B';
export type SupplierKey = 'supplierA' | 'supplierB';
export type SupplierOutcome = 'success' | 'failed';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface Hotel {
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
}

export interface HotelsResponse {
  data: Hotel[];
  meta: {
    city: string;
    totalHotels: number;
    filteredHotels: number;
    minPrice: number | null;
    maxPrice: number | null;
    cache: 'HIT' | 'MISS';
    refreshed: boolean;
    workflowId: string;
    degraded: boolean;
    supplierStatus: Record<SupplierKey, SupplierOutcome>;
    lastUpdated: string;
    cacheTtlSeconds: number;
    cityInfo: { latitude: number; longitude: number; source: string } | null;
    timestamp: string;
  };
}

export interface HotelQueryParams {
  city: string;
  minPrice?: number;
  maxPrice?: number;
  supplier?: SupplierName | '';
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'commission';
  sortOrder?: 'asc' | 'desc';
  q?: string;
  refresh?: boolean;
}

export interface OffersResponse {
  hotel: string;
  city: string;
  offers: {
    supplier: SupplierName;
    hotelId: string;
    price: number;
    commissionPct: number;
    rating: number | null;
    description: string | null;
    priceDifference: number;
    isBest: boolean;
  }[];
  bestOffer: { supplier: SupplierName; price: number; commissionPct: number } | null;
  savings: number;
  meta: { cache: 'HIT' | 'MISS'; workflowId: string; degraded: boolean };
}

export interface CityOption {
  slug: string;
  label: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface SupplierMetrics {
  requests: number;
  failures: number;
  successRate: number | null;
  avgResponseMs: number | null;
}

export interface Metrics {
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

export interface SupplierStatus extends SupplierMetrics {
  key: SupplierKey;
  name: SupplierName;
  status: 'healthy' | 'unhealthy';
  responseTimeMs: number | null;
  lastChecked: string;
}

export interface WorkflowStep {
  name: 'supplierA' | 'supplierB' | 'normalize' | 'aggregate' | 'saveToRedis' | 'enrichCity';
  status: 'success' | 'failed' | 'skipped';
  startOffsetMs: number;
  durationMs: number;
  attempts?: number;
  error?: string;
}

export interface WorkflowRun {
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

export interface RecentSearch {
  city: string;
  cache: 'HIT' | 'MISS';
  results: number;
  at: string;
}

export interface Health {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<'api' | 'redis' | 'temporal' | SupplierKey, 'healthy' | 'unhealthy'>;
}

export interface Weather {
  available: boolean;
  reason?: string;
  city: string;
  temperatureC?: number;
  condition?: string;
  description?: string;
  icon?: string;
  humidity?: number;
}

export interface CurrencyRates {
  available: boolean;
  base: 'INR';
  rates: Record<Currency, number>;
  date?: string;
  reason?: string;
}

export interface Analytics {
  cities: {
    city: string;
    label: string;
    available: boolean;
    hotels: number;
    lowestPrice: number | null;
    averagePrice: number | null;
    highestPrice: number | null;
    totalSavings: number;
    supplierWins: Record<SupplierName, number>;
    degraded: boolean;
  }[];
  totals: {
    hotels: number;
    lowestPrice: number | null;
    averagePrice: number | null;
    totalSavings: number;
    supplierWins: Record<SupplierName, number>;
    comparedHotels: number;
  };
  commission: { supplier: SupplierName; averageCommissionPct: number; offers: number }[];
  priceDistribution: { range: string; from: number; to: number | null; count: number }[];
  hotels: {
    city: string;
    name: string;
    price: number;
    supplier: SupplierName;
    commissionPct: number;
    rating: number | null;
    savings: number;
    offers: { supplier: SupplierName; price: number }[];
  }[];
  timestamp: string;
}
