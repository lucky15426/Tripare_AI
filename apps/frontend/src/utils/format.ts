import type { Currency } from '../types';

export const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP'];

/**
 * Presentation-only conversion. Stored supplier prices are always INR;
 * `rates` are INR -> currency multipliers from the backend (Frankfurter).
 */
export function convertPrice(inr: number, currency: Currency, rates: Record<Currency, number> | undefined): number {
  if (currency === 'INR' || !rates) return inr;
  return inr * (rates[currency] ?? 1);
}

export function formatPrice(inr: number, currency: Currency = 'INR', rates?: Record<Currency, number>): string {
  const value = convertPrice(inr, currency, rates);
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(value);
}

export function formatPriceCompact(inr: number, currency: Currency = 'INR', rates?: Record<Currency, number>): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(convertPrice(inr, currency, rates));
}

export const formatPercent = (ratio: number | null): string => (ratio === null ? '-' : `${Math.round(ratio * 100)}%`);

export const formatMs = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '-';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

export const titleCase = (text: string): string => text.replace(/\b\w/g, (c) => c.toUpperCase());

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
