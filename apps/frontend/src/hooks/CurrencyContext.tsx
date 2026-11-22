import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Currency } from '../types';
import { formatPrice, formatPriceCompact } from '../utils/format';
import { useCurrencyRates } from './queries';

interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  /** Formats an INR supplier price in the selected display currency. */
  format: (inr: number) => string;
  /** Compact form for chart axes, e.g. ₹5K. */
  compact: (inr: number) => string;
  ratesAvailable: boolean;
  rateDate?: string;
}

const CurrencyContext = createContext<CurrencyState | null>(null);
const STORAGE_KEY = 'staysync.currency';

function readStored(): Currency {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'INR' || stored === 'USD' || stored === 'EUR' || stored === 'GBP') return stored;
  } catch {
    /* storage may be unavailable */
  }
  return 'INR';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(readStored);
  const { data } = useCurrencyRates();
  const ratesAvailable = Boolean(data?.available);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // If live rates are unavailable we never pretend: display stays in INR.
  const effective: Currency = ratesAvailable ? currency : 'INR';
  const value = useMemo<CurrencyState>(
    () => ({
      currency: effective,
      setCurrency,
      format: (inr) => formatPrice(inr, effective, data?.rates),
      compact: (inr) => formatPriceCompact(inr, effective, data?.rates),
      ratesAvailable,
      rateDate: data?.date,
    }),
    [effective, setCurrency, data, ratesAvailable],
  );
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
