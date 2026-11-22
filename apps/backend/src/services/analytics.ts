import type { HotelCache } from '../cache/hotelCache';
import { SUPPORTED_CITIES } from '../config/cities';
import type { SupplierName } from '../types';
import { logger } from '../utils/logger';
import type { HotelSearchService } from './hotelSearch';

type PerSupplier = Record<SupplierName, number>;

export interface CityAnalytics {
  city: string;
  label: string;
  available: boolean;
  hotels: number;
  lowestPrice: number | null;
  averagePrice: number | null;
  highestPrice: number | null;
  totalSavings: number;
  supplierWins: PerSupplier;
  degraded: boolean;
}

export interface AnalyticsResponse {
  cities: CityAnalytics[];
  totals: {
    hotels: number;
    lowestPrice: number | null;
    averagePrice: number | null;
    totalSavings: number;
    supplierWins: PerSupplier;
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

const BUCKETS = [
  { from: 0, to: 3000 },
  { from: 3000, to: 5000 },
  { from: 5000, to: 7000 },
  { from: 7000, to: 9000 },
  { from: 9000, to: 12000 },
  { from: 12000, to: null as number | null },
];
const average = (values: number[]): number | null => (values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null);

/** Builds analytics from the aggregated datasets of every supported city (warming cold cities via the workflow). */
export async function buildAnalytics(search: HotelSearchService, cache: HotelCache): Promise<AnalyticsResponse> {
  const perCity = await Promise.all(
    SUPPORTED_CITIES.map(async (city) => {
      try {
        const ensured = await search.ensureCity(city.slug);
        return { city, degraded: ensured.meta.degraded, hotels: await cache.queryByPrice(city.slug) };
      } catch (error) {
        logger.warn({ city: city.slug, err: (error as Error).message }, 'analytics: city unavailable');
        return { city, degraded: true, hotels: null };
      }
    }),
  );

  const commissionTotals: Record<SupplierName, { sum: number; count: number }> = {
    'Supplier A': { sum: 0, count: 0 },
    'Supplier B': { sum: 0, count: 0 },
  };
  const allPrices: number[] = [];
  const cities: CityAnalytics[] = [];
  const hotelRows: AnalyticsResponse['hotels'] = [];
  const totalWins: PerSupplier = { 'Supplier A': 0, 'Supplier B': 0 };
  let comparedHotels = 0;

  for (const { city, hotels, degraded } of perCity) {
    const wins: PerSupplier = { 'Supplier A': 0, 'Supplier B': 0 };
    const prices = (hotels ?? []).map((hotel) => hotel.price);
    for (const hotel of hotels ?? []) {
      wins[hotel.supplier] += 1;
      totalWins[hotel.supplier] += 1;
      if (hotel.competingOffers > 1) comparedHotels += 1;
      for (const offer of hotel.offers) {
        commissionTotals[offer.supplier].sum += offer.commissionPct;
        commissionTotals[offer.supplier].count += 1;
      }
      hotelRows.push({
        city: city.slug,
        name: hotel.name,
        price: hotel.price,
        supplier: hotel.supplier,
        commissionPct: hotel.commissionPct,
        rating: hotel.rating,
        savings: hotel.savings,
        offers: hotel.offers.map((o) => ({ supplier: o.supplier, price: o.price })),
      });
    }
    allPrices.push(...prices);
    cities.push({
      city: city.slug,
      label: city.label,
      available: hotels !== null,
      hotels: prices.length,
      lowestPrice: prices.length ? Math.min(...prices) : null,
      averagePrice: average(prices),
      highestPrice: prices.length ? Math.max(...prices) : null,
      totalSavings: (hotels ?? []).reduce((sum, hotel) => sum + hotel.savings, 0),
      supplierWins: wins,
      degraded,
    });
  }

  return {
    cities,
    totals: {
      hotels: allPrices.length,
      lowestPrice: allPrices.length ? Math.min(...allPrices) : null,
      averagePrice: average(allPrices),
      totalSavings: cities.reduce((sum, c) => sum + c.totalSavings, 0),
      supplierWins: totalWins,
      comparedHotels,
    },
    commission: (Object.keys(commissionTotals) as SupplierName[]).map((supplier) => ({
      supplier,
      averageCommissionPct: commissionTotals[supplier].count ? Math.round((commissionTotals[supplier].sum / commissionTotals[supplier].count) * 10) / 10 : 0,
      offers: commissionTotals[supplier].count,
    })),
    priceDistribution: BUCKETS.map(({ from, to }) => ({
      range: to === null ? `₹${from / 1000}k+` : `₹${from / 1000}-${to / 1000}k`,
      from,
      to,
      count: allPrices.filter((price) => price >= from && (to === null || price < to)).length,
    })),
    hotels: hotelRows,
    timestamp: new Date().toISOString(),
  };
}
