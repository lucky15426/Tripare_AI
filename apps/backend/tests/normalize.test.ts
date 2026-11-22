import { describe, expect, it } from 'vitest';
import { displayHotelName, normalizeCity, normalizeHotelName } from '../src/utils/normalize';

describe('normalizeHotelName', () => {
  it('treats casing, padding and repeated spaces as the same hotel', () => {
    const variants = ['The Grand Palace', ' the grand palace ', 'THE GRAND PALACE', 'The   Grand   Palace'];
    expect(new Set(variants.map(normalizeHotelName)).size).toBe(1);
    expect(normalizeHotelName(variants[0]!)).toBe('grand palace');
  });

  it('removes punctuation and normalises ampersands and diacritics', () => {
    expect(normalizeHotelName("Taj  Mahal's Palace & Towers!")).toBe('taj mahals palace and towers');
    expect(normalizeHotelName('Hôtel Royal')).toBe('hotel royal');
  });

  it('does not reorder words or merge distinct hotels', () => {
    expect(normalizeHotelName('Hotel Royal')).not.toBe(normalizeHotelName('Royal Hotel'));
    expect(normalizeHotelName('Grand Palace')).toBe(normalizeHotelName('The Grand Palace'));
  });

  it('never returns empty for a name that is only an article', () => {
    expect(normalizeHotelName('The')).toBe('the');
    expect(normalizeHotelName('   ')).toBe('');
  });
});

describe('displayHotelName / normalizeCity', () => {
  it('title-cases shouted names and keeps normal ones', () => {
    expect(displayHotelName('  THE   GRAND PALACE ')).toBe('The Grand Palace');
    expect(displayHotelName('Hotel  Royal')).toBe('Hotel Royal');
  });
  it('normalises cities', () => {
    expect(normalizeCity('  New   DELHI ')).toBe('new delhi');
  });
});
