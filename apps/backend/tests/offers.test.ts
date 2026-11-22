import { describe, expect, it } from 'vitest';
import { aggregateOffers, normalizeSupplierOffers } from '../src/services/offers';
import { supplierAHotels } from '../src/suppliers/supplierA';
import { supplierBHotels } from '../src/suppliers/supplierB';
import type { Offer, RawSupplierHotel } from '../src/types';

const NOW = '2026-01-01T00:00:00.000Z';
const raw = (overrides: Partial<RawSupplierHotel>): RawSupplierHotel => ({
  hotelId: 'x1',
  name: 'Test Hotel',
  price: 1000,
  city: 'delhi',
  commissionPct: 10,
  rating: 4,
  latitude: 28.6,
  longitude: 77.2,
  ...overrides,
});

function aggregate(a: unknown[], b: unknown[]) {
  const na = normalizeSupplierOffers('Supplier A', a);
  const nb = normalizeSupplierOffers('Supplier B', b);
  return { hotels: aggregateOffers([...na.offers, ...nb.offers], 'delhi', NOW), rejected: [...na.rejected, ...nb.rejected] };
}

describe('mock supplier datasets', () => {
  const cities = ['delhi', 'mumbai', 'bangalore', 'jaipur', 'goa', 'hyderabad'];

  it('cover all required cities with >= 12 hotels per supplier and distinct ids', () => {
    for (const city of cities) {
      expect(supplierAHotels.some((h) => h.city === city)).toBe(true);
      expect(supplierBHotels.some((h) => h.city === city)).toBe(true);
    }
    expect(supplierAHotels.length).toBeGreaterThanOrEqual(12);
    expect(supplierBHotels.length).toBeGreaterThanOrEqual(12);
    expect(new Set(supplierAHotels.map((h) => h.hotelId)).size).toBe(supplierAHotels.length);
    expect(supplierAHotels[0]?.hotelId.startsWith('a')).toBe(true);
    expect(supplierBHotels[0]?.hotelId.startsWith('b')).toBe(true);
  });

  it('overlap on some hotels but each supplier also has unique ones (delhi)', () => {
    const delhi = (list: RawSupplierHotel[]) => list.filter((h) => h.city === 'delhi');
    const { hotels } = aggregate(delhi(supplierAHotels), delhi(supplierBHotels));
    const shared = hotels.filter((h) => h.competingOffers === 2);
    const singles = hotels.filter((h) => h.competingOffers === 1);
    expect(shared.length).toBe(3);
    expect(singles.some((h) => h.supplier === 'Supplier A')).toBe(true);
    expect(singles.some((h) => h.supplier === 'Supplier B')).toBe(true);
    expect(hotels.length).toBe(7);
  });
});

describe('aggregateOffers', () => {
  it('selects the cheapest supplier and reports savings (spec example)', () => {
    const { hotels } = aggregate(
      [raw({ hotelId: 'a1', name: 'The Grand Palace', price: 6500, commissionPct: 12 }), raw({ hotelId: 'a2', name: 'Hotel Royal', price: 4800, commissionPct: 15 })],
      [raw({ hotelId: 'b1', name: 'The Grand Palace', price: 5900, commissionPct: 18 }), raw({ hotelId: 'b2', name: 'Hotel Royal', price: 5200, commissionPct: 10 })],
    );
    const palace = hotels.find((h) => h.name === 'The Grand Palace')!;
    expect(palace).toMatchObject({ hotelId: 'b1', supplier: 'Supplier B', price: 5900, commissionPct: 18, savings: 600, originalPrice: 6500, competingOffers: 2 });
    const royal = hotels.find((h) => h.name === 'Hotel Royal')!;
    expect(royal).toMatchObject({ hotelId: 'a2', supplier: 'Supplier A', price: 4800, savings: 400 });
    expect(hotels).toHaveLength(2);
    // alternative offers are retained for comparison
    expect(palace.offers.map((o) => o.supplier)).toEqual(['Supplier B', 'Supplier A']);
  });

  it('deduplicates differently-written names of the same hotel', () => {
    const { hotels } = aggregate([raw({ name: 'The Grand Palace', price: 6500 })], [raw({ hotelId: 'b1', name: '  THE  GRAND PALACE ', price: 6000 })]);
    expect(hotels).toHaveLength(1);
    expect(hotels[0]?.price).toBe(6000);
  });

  it('keeps a hotel offered by only one supplier, with zero savings', () => {
    const { hotels } = aggregate([raw({ name: 'Only A' })], [raw({ hotelId: 'b9', name: 'Only B' })]);
    expect(hotels.map((h) => h.name).sort()).toEqual(['Only A', 'Only B']);
    expect(hotels.every((h) => h.savings === 0 && h.competingOffers === 1)).toBe(true);
  });

  it('breaks equal prices deterministically (higher commission, then supplier name)', () => {
    const tie = (cA: number, cB: number) => aggregate([raw({ hotelId: 'a1', price: 5000, commissionPct: cA })], [raw({ hotelId: 'b1', price: 5000, commissionPct: cB })]).hotels[0]!;
    expect(tie(14, 12).supplier).toBe('Supplier A');
    expect(tie(10, 16).supplier).toBe('Supplier B');
    expect(tie(10, 10).supplier).toBe('Supplier A');
    expect(tie(14, 12).savings).toBe(0);
  });

  it('never selects negative, zero, NaN or non-numeric prices', () => {
    const { hotels, rejected } = aggregate(
      [raw({ hotelId: 'a1', price: -5 }), raw({ hotelId: 'a2', name: 'Two', price: 0 }), raw({ hotelId: 'a3', name: 'Three', price: Number.NaN }), raw({ hotelId: 'a4', name: 'Four', price: '900' as unknown as number })],
      [raw({ hotelId: 'b1', price: 7000 })],
    );
    expect(hotels).toHaveLength(1);
    expect(hotels[0]).toMatchObject({ supplier: 'Supplier B', price: 7000, savings: 0 });
    expect(rejected).toHaveLength(4);
  });

  it('omits invalid coordinates instead of inventing them', () => {
    const { offers } = normalizeSupplierOffers('Supplier A', [raw({ latitude: Number.NaN, longitude: 77 }), raw({ hotelId: 'x2', name: 'Far', latitude: 120, longitude: 10 })]);
    expect(offers.every((o: Offer) => o.latitude === null && o.longitude === null)).toBe(true);
  });

  it('is deterministic regardless of input order', () => {
    const a = [raw({ hotelId: 'a1', name: 'Alpha', price: 3000 }), raw({ hotelId: 'a2', name: 'Beta', price: 3000 })];
    const b = [raw({ hotelId: 'b1', name: 'Alpha', price: 2000 }), raw({ hotelId: 'b2', name: 'Beta', price: 4000 })];
    expect(aggregate(a, b).hotels).toEqual(aggregate([...a].reverse(), [...b].reverse()).hotels);
  });
});
