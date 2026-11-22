import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../hooks/CurrencyContext';
import { useAnalytics } from '../../hooks/queries';
import { DESTINATIONS } from '../../utils/images';
import { Reveal } from '../motion';

// Deliberately uneven tiles: one anchor, two stacked, then a wide + a narrow one.
const TILE: Record<string, string> = {
  goa: 'md:col-span-7 md:row-span-2 min-h-[360px] md:min-h-[520px]',
  jaipur: 'md:col-span-5 min-h-[240px]',
  delhi: 'md:col-span-5 min-h-[240px]',
  mumbai: 'md:col-span-5 min-h-[300px]',
  bangalore: 'md:col-span-7 min-h-[300px]',
};

export default function Destinations() {
  const { format } = useCurrency();
  const analytics = useAnalytics();
  const fromPrice = (slug: string) => analytics.data?.cities.find((c) => c.city === slug)?.lowestPrice;

  return (
    <section id="destinations" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Destinations</p>
          <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">Where are you headed next?</h2>
        </div>
        <Link to="/search" className="inline-flex items-center gap-1 text-sm font-medium text-navy-900 underline-offset-4 hover:underline">
          Browse all cities <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-4 md:grid-cols-12">
        {DESTINATIONS.map((d, i) => {
          const price = fromPrice(d.slug);
          return (
            <Reveal key={d.slug} delay={i * 0.06} className={TILE[d.slug]}>
              <Link to={`/search?city=${d.slug}`} className="group relative block h-full min-h-[inherit] overflow-hidden rounded-lg bg-navy-800">
                <img src={d.image} alt={`${d.name}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/75 via-navy-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                  <div>
                    <h3 className="font-serif text-3xl">{d.name}</h3>
                    <p className="mt-1 text-sm text-white/80">{d.note}</p>
                  </div>
                  {price != null && <p className="shrink-0 text-right text-xs text-white/80">Hotels from<span className="block text-base font-semibold text-white">{format(price)}</span></p>}
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
