import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../hooks/CurrencyContext';
import { useAnalytics } from '../../hooks/queries';
import type { Analytics } from '../../types';
import { hotelImage } from '../../utils/images';
import { titleCase } from '../../utils/format';
import { Reveal } from '../motion';
import { Skeleton } from '../ui';

type Row = Analytics['hotels'][number];

function Comparison({ hotel, large }: { hotel: Row; large?: boolean }) {
  const { format } = useCurrency();
  const offers = [...hotel.offers].sort((a, b) => a.price - b.price);
  return (
    <Link to={`/search?city=${hotel.city}&q=${encodeURIComponent(hotel.name)}`} className="group block">
      <div className={`overflow-hidden rounded-lg bg-navy-100 ${large ? 'aspect-[4/3] sm:aspect-[16/11]' : 'aspect-[16/10]'}`}>
        <img src={hotelImage(hotel.name, large ? 1100 : 700, large ? 760 : 440)} alt={hotel.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className={`font-serif ${large ? 'text-3xl' : 'text-2xl'}`}>{hotel.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-navy-500">
            {titleCase(hotel.city)}
            {hotel.rating !== null && (
              <span className="inline-flex items-center gap-1 text-navy-900">
                <Star className="h-3.5 w-3.5 fill-terracotta text-terracotta" aria-hidden /> {hotel.rating.toFixed(1)}
              </span>
            )}
          </p>
        </div>
        <p className="text-right">
          <span className="block text-2xl font-semibold">{format(hotel.price)}</span>
          <span className="text-xs text-navy-500">per night</span>
        </p>
      </div>
      <ul className="mt-3 divide-y divide-navy-100 border-y border-navy-100 text-sm">
        {offers.map((offer, i) => (
          <li key={offer.supplier} className="flex items-center justify-between py-2">
            <span className={i === 0 ? 'font-medium text-navy-900' : 'text-navy-500'}>{offer.supplier}</span>
            <span className={i === 0 ? 'border-b-2 border-terracotta font-semibold' : 'text-navy-500'}>{format(offer.price)}</span>
          </li>
        ))}
      </ul>
      {hotel.savings > 0 && <p className="mt-3 text-sm font-medium text-saving-700">Save {format(hotel.savings)} compared to the next offer.</p>}
    </Link>
  );
}

export default function FeaturedHotels() {
  const { data, isLoading, isError } = useAnalytics();
  // Real data: the three hotels where comparing suppliers saves the most.
  const featured = (data?.hotels ?? []).filter((h) => h.offers.length > 1).sort((a, b) => b.savings - a.savings).slice(0, 3);

  if (isError || (!isLoading && featured.length === 0)) return null;
  const [first, second, third] = featured;

  return (
    <section className="border-y border-navy-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <p className="eyebrow">Compared right now</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">The same room, priced differently.</h2>
          <p className="mt-4 max-w-xl text-navy-500">Each hotel is listed by more than one supplier. We show every offer and keep the cheapest one on top.</p>
        </Reveal>
        {isLoading ? (
          <div className="mt-12 grid gap-10 lg:grid-cols-12">
            <Skeleton className="h-[420px] lg:col-span-7" />
            <Skeleton className="h-[420px] lg:col-span-5" />
          </div>
        ) : (
          <div className="mt-12 grid gap-x-10 gap-y-12 lg:grid-cols-12">
            {first && <Reveal className="lg:col-span-7"><Comparison hotel={first} large /></Reveal>}
            <div className="grid content-start gap-12 lg:col-span-5">
              {second && <Reveal delay={0.08}><Comparison hotel={second} /></Reveal>}
              {third && <Reveal delay={0.16}><Comparison hotel={third} /></Reveal>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
