import { describe, expect, it } from 'vitest';
import { convertPrice, formatMs, formatPrice, timeAgo } from './format';

const rates = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095 };

describe('currency presentation', () => {
  it('leaves INR untouched and converts only for display', () => {
    expect(convertPrice(5900, 'INR', rates)).toBe(5900);
    expect(convertPrice(5000, 'USD', rates)).toBeCloseTo(60);
  });
  it('falls back to INR values when no rates are available', () => {
    expect(convertPrice(5900, 'USD', undefined)).toBe(5900);
  });
  it('formats currencies', () => {
    expect(formatPrice(5900, 'INR')).toContain('5,900');
    expect(formatPrice(5000, 'USD', rates)).toContain('60');
  });
});

describe('misc formatting', () => {
  it('formats durations', () => {
    expect(formatMs(250)).toBe('250ms');
    expect(formatMs(1500)).toBe('1.50s');
    expect(formatMs(null)).toBe('-');
  });
  it('formats relative time', () => {
    const now = Date.parse('2026-01-01T00:10:00Z');
    expect(timeAgo('2026-01-01T00:09:30Z', now)).toBe('30s ago');
    expect(timeAgo('2026-01-01T00:05:00Z', now)).toBe('5m ago');
    expect(timeAgo(null, now)).toBe('never');
  });
});
