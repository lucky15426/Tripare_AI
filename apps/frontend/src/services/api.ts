import type {
  Analytics,
  CityOption,
  CurrencyRates,
  Health,
  HotelQueryParams,
  HotelsResponse,
  Metrics,
  OffersResponse,
  RecentSearch,
  SupplierKey,
  SupplierStatus,
  Weather,
  WorkflowRun,
} from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly meta?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(`Cannot reach the StaySync API at ${API_BASE_URL}. Is the backend running?`, 0, 'NETWORK');
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: { message?: string; code?: string }; meta?: unknown } | null) ?? {};
    throw new ApiError(error.error?.message ?? `Request failed (${response.status})`, response.status, error.error?.code, error.meta);
  }
  return body as T;
}

const qs = (params: Record<string, string | number | boolean | undefined | null>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const api = {
  hotels: (params: HotelQueryParams) => request<HotelsResponse>(`/api/hotels${qs({ ...params })}`),
  offers: (city: string, hotel: string) => request<OffersResponse>(`/api/hotels/${encodeURIComponent(hotel)}/offers${qs({ city })}`),
  cities: () => request<{ data: CityOption[] }>('/api/cities'),
  // /health intentionally answers 503 *with* a full body when unhealthy; that body is data, not an error.
  health: async (): Promise<Health> => {
    try {
      return (await (await fetch(`${API_BASE_URL}/health`)).json()) as Health;
    } catch {
      throw new ApiError(`Cannot reach the StaySync API at ${API_BASE_URL}.`, 0, 'NETWORK');
    }
  },
  metrics: () => request<{ data: Metrics }>('/api/metrics'),
  workflows: () => request<{ data: WorkflowRun[]; temporalUiUrl: string }>('/api/workflows?limit=50'),
  recentSearches: () => request<{ data: RecentSearch[] }>('/api/recent-searches'),
  suppliers: () => request<{ data: SupplierStatus[]; devControls: boolean }>('/api/suppliers'),
  analytics: () => request<Analytics>('/api/analytics'),
  weather: (city: string) => request<Weather>(`/api/weather${qs({ city })}`),
  currency: () => request<CurrencyRates>('/api/currency'),
  simulate: (key: SupplierKey, body: { enabled?: boolean; latencyMs?: number; errorRate?: number }) =>
    request(`/api/dev/suppliers/${key}`, { method: 'POST', body: JSON.stringify(body) }),
  resetSimulations: () => request('/api/dev/suppliers/reset', { method: 'POST' }),
};
