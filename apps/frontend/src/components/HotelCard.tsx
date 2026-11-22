import { ArrowRight, MapPin, Star } from 'lucide-react';
import { useState } from 'react';
import { useCurrency } from '../hooks/CurrencyContext';
import type { Hotel } from '../types';
import { titleCase } from '../utils/format';
import { hotelImage } from '../utils/images';
import { StaggerItem } from './motion';
import { SupplierBadge } from './ui';

export default function HotelCard({ hotel, index = 0, onViewOffers }: { hotel: Hotel; index?: number; onViewOffers: (hotel: Hotel) => void }) {
  const { format } = useCurrency();
  const [imageFailed, setImageFailed] = useState(false);
  const compared = hotel.competingOffers > 1;

  return (
    <StaggerItem index={index}>
      <article className="group flex h-full flex-col">
        <button onClick={() => onViewOffers(hotel)} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-navy-100" aria-label={`Compare offers for ${hotel.name}`}>
          {!imageFailed && (
            <img src={hotelImage(hotel.name, 720, 540)} alt={hotel.name} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
          )}
          <span className="absolute left-3 top-3"><SupplierBadge supplier={hotel.supplier} /></span>
        </button>

        <div className="flex flex-1 flex-col pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl leading-snug">{hotel.name}</h3>
            {hotel.rating !== null && (
              <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-sm font-medium">
                <Star className="h-3.5 w-3.5 fill-terracotta text-terracotta" aria-hidden /> {hotel.rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-navy-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {titleCase(hotel.city)}
          </p>

          <div className="mt-4 flex items-end justify-between border-t border-navy-100 pt-4">
            <div>
              <p className="text-2xl font-semibold leading-none tracking-tight">{format(hotel.price)}</p>
              <p className="mt-1 text-xs text-navy-500">per night · {hotel.commissionPct}% commission</p>
            </div>
            {compared && <p className="text-right text-xs text-navy-400 line-through">{format(hotel.originalPrice)}</p>}
          </div>
          {hotel.savings > 0 ? (
            <p className="mt-2 text-sm font-medium text-saving-700">Save {format(hotel.savings)} compared to the next offer.</p>
          ) : (
            <p className="mt-2 text-sm text-navy-500">{compared ? 'Both suppliers match on price.' : 'Offered by one supplier.'}</p>
          )}

          <button onClick={() => onViewOffers(hotel)} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-navy-900 underline-offset-4 hover:underline">
            Compare offers <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
      </article>
    </StaggerItem>
  );
}

export function HotelCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-3 pt-4">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-7 w-1/2" />
      </div>
    </div>
  );
}
