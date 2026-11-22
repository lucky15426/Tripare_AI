export interface CityInfo {
  slug: string;
  label: string;
  state: string;
  latitude: number;
  longitude: number;
}

/** Cities served by the mocked suppliers. Coordinates are well-known city centres. */
export const SUPPORTED_CITIES: CityInfo[] = [
  { slug: 'delhi', label: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { slug: 'mumbai', label: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777 },
  { slug: 'bangalore', label: 'Bangalore', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { slug: 'jaipur', label: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { slug: 'goa', label: 'Goa', state: 'Goa', latitude: 15.2993, longitude: 74.124 },
  { slug: 'hyderabad', label: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
];

export const findCity = (slug: string): CityInfo | undefined => SUPPORTED_CITIES.find((c) => c.slug === slug);
