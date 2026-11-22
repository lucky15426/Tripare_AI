import type { AggregatedHotel, NormalizeResult, Offer, OfferSummary, SupplierName } from '../types';
import { displayHotelName, normalizeCity, normalizeHotelName } from '../utils/normalize';

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** A price is only valid if it is a finite number strictly greater than zero. */
export const isValidPrice = (price: unknown): price is number => typeof price === 'number' && Number.isFinite(price) && price > 0;

/** Validates + normalises one supplier's raw payload. Invalid offers are reported, never silently dropped. */
export function normalizeSupplierOffers(supplier: SupplierName, rawHotels: unknown[]): NormalizeResult {
  const offers: Offer[] = [];
  const rejected: NormalizeResult['rejected'] = [];

  for (const entry of rawHotels) {
    const raw = (entry ?? {}) as Record<string, unknown>;
    const hotelId = typeof raw.hotelId === 'string' ? raw.hotelId : String(raw.hotelId ?? 'unknown');
    const name = typeof raw.name === 'string' ? displayHotelName(raw.name) : '';
    const normalizedName = normalizeHotelName(name);

    if (!normalizedName) {
      rejected.push({ supplier, hotelId, reason: 'missing hotel name' });
      continue;
    }
    if (!isValidPrice(raw.price)) {
      rejected.push({ supplier, hotelId, reason: `invalid price: ${String(raw.price)}` });
      continue;
    }

    const rating = finiteNumber(raw.rating);
    const latitude = finiteNumber(raw.latitude);
    const longitude = finiteNumber(raw.longitude);
    const hasCoordinates = latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    const commission = finiteNumber(raw.commissionPct);

    offers.push({
      supplier,
      hotelId,
      name,
      normalizedName,
      city: normalizeCity(typeof raw.city === 'string' ? raw.city : ''),
      price: raw.price,
      commissionPct: commission !== null && commission >= 0 && commission <= 100 ? commission : 0,
      rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
      latitude: hasCoordinates ? latitude : null,
      longitude: hasCoordinates ? longitude : null,
      description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null,
    });
  }
  return { offers, rejected };
}

/**
 * Deterministic ordering of competing offers:
 * 1. lowest price, 2. higher commission (better for the platform on a tie), 3. supplier name.
 */
export function compareOffers(a: Offer, b: Offer): number {
  return a.price - b.price || b.commissionPct - a.commissionPct || a.supplier.localeCompare(b.supplier);
}

const toSummary = (offer: Offer): OfferSummary => ({
  supplier: offer.supplier,
  hotelId: offer.hotelId,
  price: offer.price,
  commissionPct: offer.commissionPct,
  rating: offer.rating,
  description: offer.description,
});

/** Groups offers by normalised hotel name and keeps the cheapest valid offer per hotel. */
export function aggregateOffers(offers: Offer[], city: string, lastUpdated: string): AggregatedHotel[] {
  const groups = new Map<string, Offer[]>();
  for (const offer of offers) {
    if (!isValidPrice(offer.price)) continue;
    const group = groups.get(offer.normalizedName);
    if (group) group.push(offer);
    else groups.set(offer.normalizedName, [offer]);
  }

  const hotels: AggregatedHotel[] = [];
  for (const [slug, group] of groups) {
    const sorted = [...group].sort(compareOffers);
    // A supplier may list the same hotel twice; keep only its best offer per supplier.
    const perSupplier = sorted.filter((offer, index) => sorted.findIndex((o) => o.supplier === offer.supplier) === index);
    const winner = perSupplier[0];
    const mostExpensive = perSupplier[perSupplier.length - 1];
    if (!winner || !mostExpensive) continue;

    // Fill gaps in the winner's metadata from other suppliers (e.g. missing coordinates).
    const fallback = <K extends 'rating' | 'latitude' | 'longitude' | 'description'>(key: K): Offer[K] =>
      winner[key] ?? perSupplier.find((o) => o[key] !== null)?.[key] ?? (null as Offer[K]);

    const savings = perSupplier.length > 1 ? mostExpensive.price - winner.price : 0;
    hotels.push({
      hotelId: winner.hotelId,
      slug,
      name: winner.name,
      city,
      price: winner.price,
      supplier: winner.supplier,
      commissionPct: winner.commissionPct,
      rating: fallback('rating'),
      latitude: fallback('latitude'),
      longitude: fallback('longitude'),
      description: fallback('description'),
      originalPrice: mostExpensive.price,
      savings,
      priceDifference: savings,
      competingOffers: perSupplier.length,
      lastUpdated,
      offers: perSupplier.map(toSummary),
    });
  }
  return hotels.sort((a, b) => a.price - b.price || a.slug.localeCompare(b.slug));
}
