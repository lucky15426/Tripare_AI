import type { RawSupplierHotel } from '../types';

// [name, price(INR/night), commissionPct, rating, latitude, longitude, description]
type Row = [string, number, number, number, number, number, string];

const CATALOGUE: Record<string, Row[]> = {
  delhi: [
    ['The Grand Palace', 6500, 12, 4.5, 28.6139, 77.209, 'Colonial-style landmark near India Gate with a rooftop bar and spa.'],
    ['Hotel Royal', 4800, 15, 4.1, 28.62, 77.215, 'Comfortable business hotel a short walk from Connaught Place.'],
    ['Connaught Residency', 7200, 14, 4.4, 28.6315, 77.2167, 'Boutique stay in the heart of Connaught Place, with a 24h lounge.'],
    ['Karol Bagh Inn', 2600, 10, 3.6, 28.6519, 77.1909, 'No-frills budget rooms beside the Karol Bagh metro and market.'],
    ['Aerocity Suites', 8900, 16, 4.6, 28.5562, 77.1, 'Modern airport-side suites with a 24h shuttle and pool.'],
  ],
  mumbai: [
    ['Marine Drive Grand', 9800, 13, 4.6, 18.944, 72.823, 'Sea-facing rooms on Queen\'s Necklace with a signature restaurant.'],
    ['Juhu Beach Resort', 7600, 15, 4.3, 19.099, 72.826, 'Beachfront resort with a pool and live-music evenings.'],
    ['The Bandra Boutique', 5400, 11, 4.2, 19.0596, 72.8295, 'Design-led boutique hotel in the cafe district of Bandra West.'],
    ['Colaba Heritage Inn', 3900, 12, 3.9, 18.9067, 72.8147, 'Art-deco inn steps from the Gateway of India.'],
    ['Andheri Airport Lodge', 3100, 9, 3.7, 19.1136, 72.8697, 'Practical stopover near the domestic and international terminals.'],
  ],
  bangalore: [
    ['Garden City Residency', 5200, 12, 4.3, 12.9716, 77.5946, 'Leafy business hotel close to Cubbon Park and the CBD.'],
    ['MG Road Plaza', 6100, 14, 4.2, 12.9756, 77.6068, 'Central hotel on MG Road with a rooftop pool.'],
    ['Whitefield Business Hotel', 4700, 10, 4.0, 12.9698, 77.75, 'Tech-corridor hotel with coworking floors and a gym.'],
    ['Indiranagar Loft', 3800, 13, 4.1, 12.9784, 77.6408, 'Loft-style rooms above the 100 Feet Road restaurants.'],
    ['Koramangala Stay', 2900, 11, 3.8, 12.9352, 77.6245, 'Simple, clean rooms for startup-district travellers.'],
  ],
  jaipur: [
    ['Amber Fort Palace', 8800, 15, 4.7, 26.9855, 75.8513, 'Heritage palace hotel with Amber Fort views and royal suites.'],
    ['Pink City Haveli', 4300, 12, 4.2, 26.9239, 75.8267, 'Restored haveli in the walled city with courtyard dining.'],
    ['Hawa Mahal Residency', 5100, 14, 4.3, 26.924, 75.827, 'Rooftop terrace facing the Hawa Mahal facade.'],
    ['Rambagh Lodge', 3600, 10, 3.9, 26.899, 75.801, 'Quiet garden lodge south of the old city.'],
    ['Jaipur Junction Hotel', 2200, 8, 3.5, 26.9196, 75.7878, 'Budget rooms opposite the railway station.'],
  ],
  goa: [
    ['Calangute Beach Resort', 7200, 14, 4.4, 15.5439, 73.7553, 'Beach-access resort with two pools and a kids club.'],
    ['Baga Sands Hotel', 5600, 12, 4.1, 15.5557, 73.7517, 'Lively hotel moments from Baga beach and the nightlife strip.'],
    ['Palolem Cove Cottages', 4200, 10, 4.3, 15.01, 74.0232, 'Palm-shaded cottages on the quiet south Goa coast.'],
    ['Panjim Heritage Inn', 3300, 11, 3.9, 15.4989, 73.8278, 'Portuguese-era townhouse in the Fontainhas quarter.'],
    ['Anjuna Hippie Hostel', 1700, 8, 3.6, 15.5736, 73.7413, 'Social hostel near the Anjuna flea market.'],
  ],
  hyderabad: [
    ['Charminar Grand', 4600, 13, 4.2, 17.3616, 78.4747, 'Old-city hotel a few minutes from Charminar and Laad Bazaar.'],
    ['Hitech City Suites', 6200, 15, 4.4, 17.4435, 78.3772, 'Extended-stay suites for the HITEC City tech belt.'],
    ['Banjara Hills Residency', 7800, 12, 4.6, 17.4126, 78.4482, 'Upscale residential-area hotel with a fine-dining restaurant.'],
    ['Secunderabad Station Inn', 2400, 9, 3.5, 17.4399, 78.4983, 'Value rooms near Secunderabad junction.'],
    ['Nizam Palace Hotel', 10800, 16, 4.8, 17.3578, 78.4731, 'Palatial luxury hotel with heritage dining and a spa.'],
  ],
};

export const supplierAHotels: RawSupplierHotel[] = Object.entries(CATALOGUE)
  .flatMap(([city, rows]) => rows.map((row) => ({ city, row })))
  .map(({ city, row: [name, price, commissionPct, rating, latitude, longitude, description] }, index) => ({
    hotelId: `a${index + 1}`,
    name,
    price,
    city,
    commissionPct,
    rating,
    latitude,
    longitude,
    description,
  }));
