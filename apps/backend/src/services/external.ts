import { findCity } from '../config/cities';
import type { Env } from '../config/env';
import type { RedisClient } from '../cache/redis';
import type { CityEnrichment } from '../types';
import { logger } from '../utils/logger';
import { normalizeCity } from '../utils/normalize';

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface WeatherInfo {
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

async function getJson<T>(url: string, timeoutMs = 4000): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** City coordinates: Geoapify when configured, otherwise a built-in table for supported cities. */
export async function geocodeCity(env: Env, rawCity: string): Promise<CityEnrichment | null> {
  const city = normalizeCity(rawCity);
  if (env.GEOAPIFY_API_KEY) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(`${city}, India`)}&limit=1&format=json&apiKey=${env.GEOAPIFY_API_KEY}`;
      const body = await getJson<{ results?: { lat: number; lon: number }[] }>(url);
      const hit = body.results?.[0];
      if (hit) return { city, latitude: hit.lat, longitude: hit.lon, source: 'geoapify' };
    } catch (error) {
      logger.warn({ city, err: (error as Error).message }, 'geoapify lookup failed, using built-in coordinates');
    }
  }
  const known = findCity(city);
  return known ? { city, latitude: known.latitude, longitude: known.longitude, source: 'builtin' } : null;
}

export async function fetchWeather(env: Env, redis: RedisClient, rawCity: string): Promise<WeatherInfo> {
  const city = normalizeCity(rawCity);
  if (!env.OPENWEATHER_API_KEY) {
    return { available: false, city, reason: 'OPENWEATHER_API_KEY is not configured' };
  }
  const cacheKey = `weather:${city}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as WeatherInfo;
  } catch {
    /* cache is best-effort */
  }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${env.OPENWEATHER_API_KEY}`;
    const body = await getJson<{
      main: { temp: number; humidity: number };
      weather: { main: string; description: string; icon: string }[];
    }>(url);
    const weather = body.weather[0];
    const info: WeatherInfo = {
      available: true,
      city,
      temperatureC: Math.round(body.main.temp),
      condition: weather?.main,
      description: weather?.description,
      icon: weather ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : undefined,
      humidity: body.main.humidity,
    };
    await redis.set(cacheKey, JSON.stringify(info), 'EX', 600).catch(() => undefined);
    return info;
  } catch (error) {
    logger.warn({ city, err: (error as Error).message }, 'weather lookup failed');
    return { available: false, city, reason: 'Weather service unavailable' };
  }
}

const IDENTITY_RATES: Record<Currency, number> = { INR: 1, USD: 1, EUR: 1, GBP: 1 };

/** INR -> other currencies. Used for presentation only; stored prices are always INR. */
export async function fetchCurrencyRates(env: Env, redis: RedisClient): Promise<CurrencyRates> {
  const cacheKey = 'currency:INR';
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as CurrencyRates;
  } catch {
    /* best-effort */
  }
  try {
    const body = await getJson<{ date: string; rates: Record<string, number> }>(
      `${env.FRANKFURTER_URL}/latest?from=INR&to=USD,EUR,GBP`,
    );
    const rates: CurrencyRates = {
      available: true,
      base: 'INR',
      date: body.date,
      rates: { INR: 1, USD: body.rates.USD ?? 1, EUR: body.rates.EUR ?? 1, GBP: body.rates.GBP ?? 1 },
    };
    await redis.set(cacheKey, JSON.stringify(rates), 'EX', 3600).catch(() => undefined);
    return rates;
  } catch (error) {
    logger.warn({ err: (error as Error).message }, 'currency lookup failed');
    return { available: false, base: 'INR', rates: IDENTITY_RATES, reason: 'Exchange-rate service unavailable' };
  }
}
