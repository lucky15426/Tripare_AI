import type { RawSupplierHotel } from '../types';

// [name, price(INR/night), commissionPct, rating, latitude, longitude, description]
// Names intentionally differ in casing/spacing/articles for some overlapping hotels,
// mirroring real-world supplier inconsistencies.
type Row = [string, number, number, number, number, number, string];

const CATALOGUE: Record<string, Row[]> = {
  delhi: [
    ['THE GRAND PALACE', 5900, 18, 4.5, 28.6139, 77.209, 'Iconic palace hotel with spa access and complimentary breakfast.'],
    ['  Hotel  Royal ', 5200, 10, 4.1, 28.62, 77.215, 'Well-located city hotel, breakfast included in every rate.'],
    ['Connaught Residency', 7450, 9, 4.4, 28.6316, 77.2166, 'Elegant rooms next to Connaught Place shopping arcades.'],
    ['Paharganj Backpackers', 1800, 8, 3.4, 28.643, 77.213, 'Rooftop hostel by New Delhi station, dorms and privates.'],
    ['Lutyens Heritage Hotel', 11200, 17, 4.8, 28.6, 77.22, 'Grand heritage hotel in leafy Lutyens\' Delhi with a butler service.'],
  ],
  mumbai: [
    ['Marine Drive Grand', 9200, 16, 4.6, 18.9441, 72.8231, 'Promenade-side luxury with free airport pickup.'],
    ['JUHU BEACH RESORT', 8100, 12, 4.3, 19.0991, 72.8261, 'Resort on Juhu seafront; sunset terrace and wellness centre.'],
    ['The Bandra Boutique', 5650, 14, 4.2, 19.0597, 72.8296, 'Intimate hotel in Bandra with an in-house cafe.'],
    ['Powai Lakeside Hotel', 6700, 15, 4.4, 19.1176, 72.906, 'Lake-view rooms in the Powai corporate hub.'],
    ['Gateway Palace', 12500, 18, 4.8, 18.922, 72.8347, 'Landmark luxury hotel facing the Arabian Sea.'],
  ],
  bangalore: [
    ['Garden City Residency', 4950, 15, 4.3, 12.9717, 77.5947, 'Calm CBD hotel with a garden restaurant.'],
    ['MG Road Plaza', 6350, 11, 4.2, 12.9757, 77.6069, 'MG Road high-rise with city views and a rooftop bar.'],
    ['The Whitefield Business Hotel', 4800, 17, 4.0, 12.9699, 77.7501, 'Business hotel with meeting rooms near ITPL.'],
    ['Cubbon Park Retreat', 7400, 16, 4.5, 12.9763, 77.5929, 'Boutique retreat facing Cubbon Park.'],
    ['Electronic City Inn', 2500, 9, 3.5, 12.8456, 77.6603, 'Economical inn for Electronic City commuters.'],
  ],
  jaipur: [
    ['Amber Fort Palace', 9100, 11, 4.7, 26.9856, 75.8514, 'Restored palace with royal dining and elephant-view terrace.'],
    ['Pink City Haveli', 4100, 16, 4.2, 26.924, 75.8268, 'Family-run haveli with rooftop dining in the old city.'],
    ['Hawa Mahal Residency', 5100, 12, 4.3, 26.9241, 75.8271, 'Hawa Mahal-facing rooms with a rooftop cafe.'],
    ['Jal Mahal View', 6900, 17, 4.4, 26.964, 75.846, 'Lake-view rooms along the Man Sagar road.'],
    ['Nahargarh Hills Resort', 7800, 13, 4.5, 26.937, 75.815, 'Hillside resort with a pool and sweeping views.'],
  ],
  goa: [
    ['Calangute Beach Resort', 6800, 17, 4.4, 15.544, 73.7554, 'Beachfront resort with sunset deck and water sports desk.'],
    ['BAGA SANDS HOTEL', 5900, 13, 4.1, 15.5558, 73.7518, 'Baga beach hotel with live music nights.'],
    ['Palolem Cove Cottages', 4500, 9, 4.3, 15.0101, 74.0233, 'Beach cottages with kayak rentals.'],
    ['Candolim Luxury Villas', 13500, 18, 4.8, 15.518, 73.762, 'Private pool villas with a butler and chef on request.'],
    ['Vagator Cliff Resort', 8400, 15, 4.5, 15.6, 73.744, 'Clifftop resort overlooking Vagator beach.'],
  ],
  hyderabad: [
    ['Charminar Grand', 4450, 16, 4.2, 17.3617, 78.4748, 'Heritage-district hotel with a Hyderabadi biryani kitchen.'],
    ['Hitech City Suites', 6500, 10, 4.4, 17.4436, 78.3773, 'Serviced suites close to Cyber Towers.'],
    ['Banjara Hills Residency', 7800, 14, 4.6, 17.4127, 78.4483, 'Quiet Banjara Hills hotel with a rooftop pool.'],
    ['Gachibowli Tech Stay', 5300, 12, 4.1, 17.4401, 78.3489, 'Practical rooms near the financial district.'],
    ['Golconda View Resort', 6100, 17, 4.3, 17.3833, 78.4011, 'Resort retreat with a view of Golconda Fort.'],
  ],
};

export const supplierBHotels: RawSupplierHotel[] = Object.entries(CATALOGUE)
  .flatMap(([city, rows]) => rows.map((row) => ({ city, row })))
  .map(({ city, row: [name, price, commissionPct, rating, latitude, longitude, description] }, index) => ({
    hotelId: `b${index + 1}`,
    name,
    price,
    city,
    commissionPct,
    rating,
    latitude,
    longitude,
    description,
  }));
