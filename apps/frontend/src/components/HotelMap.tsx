import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useCurrency } from '../hooks/CurrencyContext';
import type { Hotel } from '../types';
import { SupplierBadge } from './ui';

type Located = Hotel & { latitude: number; longitude: number };

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1 && points[0]) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export default function HotelMap({ hotels, center }: { hotels: Hotel[]; center?: [number, number] }) {
  const { format } = useCurrency();
  // Hotels without coordinates are omitted rather than given invented ones.
  const located = useMemo(() => hotels.filter((h): h is Located => h.latitude !== null && h.longitude !== null), [hotels]);
  const points = useMemo(() => located.map((h): [number, number] => [h.latitude, h.longitude]), [located]);
  const omitted = hotels.length - located.length;

  return (
    <div>
      <MapContainer center={center ?? points[0] ?? [22.5, 79]} zoom={center ? 11 : 5} scrollWheelZoom className="h-[520px] w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {located.map((hotel) => (
          <Marker
            key={hotel.slug}
            position={[hotel.latitude, hotel.longitude]}
            icon={L.divIcon({ className: '', html: `<div class="price-pin ${hotel.supplier === 'Supplier B' ? 'b' : ''}">${format(hotel.price)}</div>`, iconSize: [0, 0] })}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{hotel.name}</p>
                <p className="text-base font-bold text-indigo-600">{format(hotel.price)}</p>
                <SupplierBadge supplier={hotel.supplier} />
                <p className="text-xs">Rating: {hotel.rating?.toFixed(1) ?? 'n/a'}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {omitted > 0 && <p className="mt-2 text-xs text-navy-500">{omitted} hotel(s) have no coordinates and are not shown on the map.</p>}
    </div>
  );
}
