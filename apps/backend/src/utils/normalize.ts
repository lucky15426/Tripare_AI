const stripDiacritics = (s: string): string => s.normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Canonical form of a city used for cache keys and supplier queries. */
export function normalizeCity(city: string): string {
  return stripDiacritics(city).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Canonical form of a hotel name used to group offers from different suppliers.
 * - strips diacritics, lowercases, "&" -> "and"
 * - removes punctuation, collapses whitespace
 * - drops a leading article ("the"), a very common cross-supplier variation
 * Word order is never changed ("Hotel Royal" and "Royal Hotel" stay distinct).
 */
export function normalizeHotelName(name: string): string {
  const base = stripDiacritics(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const withoutArticle = base.replace(/^the\s+/, '');
  return withoutArticle || base;
}

/** Display-friendly name: trimmed, single-spaced, Title Case if the supplier shouted. */
export function displayHotelName(name: string): string {
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)) {
    return cleaned.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return cleaned;
}
