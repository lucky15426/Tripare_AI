// Photography: Unsplash, hot-linked with its CDN URL parameters. Credit is shown in the site footer.
// Every id below was checked to resolve and to show a hotel / resort / Indian landmark.
const u = (id: string, w: number, h?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=75`;

const POOLS = {
  beach: ['1561501900-3701fa6a0864', '1540541338287-41700207dee6', '1506059612708-99d6c258160e', '1520250497591-112f2f40a3f4', '1566073771259-6a8506099945'],
  heritage: ['1590490360182-c33d57733427', '1445019980597-93fa8acb246c', '1564501049412-61c2a3083791', '1535827841776-24afc1e255ac'],
  modern: ['1544124499-58912cbddaad', '1455587734955-081b22074882', '1578683010236-d716f9a3f461', '1571896349842-33c89424de2d', '1551882547-ff40c63fe5fa'],
  budget: ['1522708323590-d24dbb6b0267', '1631049307264-da0ec9d70304', '1618773928121-c32242e63f39'],
} as const;

type Style = keyof typeof POOLS;

/** Maps a hotel name to a photo style, so "Candolim Luxury Villas" gets a resort and "Karol Bagh Inn" a simple room. */
export function hotelStyle(name: string): Style {
  const n = name.toLowerCase();
  if (/hostel|backpack|\binn\b|lodge|junction|station|\bstay\b/.test(n)) return 'budget';
  if (/palace|haveli|fort|heritage|nizam|residency|mahal|charminar/.test(n)) return 'heritage';
  if (/beach|cove|sands|cliff|resort|villa|lake|hills/.test(n)) return 'beach';
  return 'modern';
}

const hash = (text: string): number => {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
};

/** Deterministic, name-aware hotel photo (same hotel => same photo, across suppliers and pages). */
export function hotelImage(nameOrSlug: string, width = 800, height?: number): string {
  const key = nameOrSlug.toLowerCase().trim().replace(/^the\s+/, '');
  const pool = POOLS[hotelStyle(key)];
  return u(pool[hash(key) % pool.length] as string, width, height);
}

export const HERO_IMAGE = u('1582719508461-905c673771fd', 2200);

export const DESTINATIONS = [
  { slug: 'goa', name: 'Goa', note: 'Beach resorts and quiet coves', image: u('1512343879784-a960bf40e7f2', 1000) },
  { slug: 'jaipur', name: 'Jaipur', note: 'Havelis and palace hotels', image: u('1477587458883-47145ed94245', 900) },
  { slug: 'delhi', name: 'Delhi', note: 'From Connaught Place to Aerocity', image: u('1587474260584-136574528ed5', 900) },
  { slug: 'mumbai', name: 'Mumbai', note: 'Sea-facing stays and boutique finds', image: u('1570168007204-dfb528c6958f', 1000) },
  { slug: 'bangalore', name: 'Bangalore', note: 'Garden-city business hotels', image: u('1596176530529-78163a4f7af2', 900) },
] as const;
