import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { HotelQueryParams, SupplierKey } from '../types';

export const useHotels = (params: HotelQueryParams) =>
  useQuery({
    queryKey: ['hotels', params],
    queryFn: () => api.hotels(params),
    enabled: params.city.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    retry: 1,
  });

/** Forces a new Temporal aggregation (refresh=true) and primes the query cache with the fresh result. */
export function useRefreshHotels() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (params: HotelQueryParams) => api.hotels({ ...params, refresh: true }),
    onSuccess: (data, params) => {
      client.setQueryData(['hotels', params], data);
      void client.invalidateQueries({ queryKey: ['hotels'] });
      for (const key of ['metrics', 'workflows', 'analytics', 'suppliers', 'recent']) void client.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useOffers = (city: string, hotel: string | null) =>
  useQuery({ queryKey: ['offers', city, hotel], queryFn: () => api.offers(city, hotel as string), enabled: Boolean(hotel) });

export const useCities = () => useQuery({ queryKey: ['cities'], queryFn: api.cities, staleTime: Infinity });
export const useMetrics = () => useQuery({ queryKey: ['metrics'], queryFn: api.metrics, refetchInterval: 10_000 });
export const useWorkflows = () => useQuery({ queryKey: ['workflows'], queryFn: api.workflows, refetchInterval: 10_000 });
export const useRecentSearches = () => useQuery({ queryKey: ['recent'], queryFn: api.recentSearches, refetchInterval: 15_000 });
export const useSuppliers = () => useQuery({ queryKey: ['suppliers'], queryFn: api.suppliers, refetchInterval: 8_000 });
export const useAnalytics = () => useQuery({ queryKey: ['analytics'], queryFn: api.analytics, staleTime: 30_000, retry: 1 });
export const useWeather = (city: string) =>
  useQuery({ queryKey: ['weather', city], queryFn: () => api.weather(city), enabled: city.length > 0, staleTime: 300_000 });
export const useCurrencyRates = () => useQuery({ queryKey: ['currency'], queryFn: api.currency, staleTime: 3_600_000 });
export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 15_000, retry: 0 });

export function useSimulation() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ['suppliers'] });
  return {
    simulate: useMutation({
      mutationFn: ({ key, body }: { key: SupplierKey; body: { enabled?: boolean; latencyMs?: number; errorRate?: number } }) => api.simulate(key, body),
      onSuccess: invalidate,
    }),
    reset: useMutation({ mutationFn: api.resetSimulations, onSuccess: invalidate }),
  };
}
