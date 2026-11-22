import { AlertTriangle, List, Map as MapIcon, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import FiltersBar, { DEFAULT_FILTERS, priceRangeError, type Filters } from '../components/FiltersBar';
import HotelCard, { HotelCardSkeleton } from '../components/HotelCard';
import HotelMap from '../components/HotelMap';
import OffersModal from '../components/OffersModal';
import WeatherCard from '../components/WeatherCard';
import { Button, EmptyState, ErrorState, cn } from '../components/ui';
import { useCities, useHotels, useRefreshHotels } from '../hooks/queries';
import { useDebounced } from '../hooks/useDebounced';
import type { Hotel, HotelQueryParams } from '../types';
import { timeAgo, titleCase } from '../utils/format';

const toParams = (city: string, f: Filters): HotelQueryParams => ({
  city,
  minPrice: f.minPrice === '' ? undefined : Number(f.minPrice),
  maxPrice: f.maxPrice === '' ? undefined : Number(f.maxPrice),
  supplier: f.supplier,
  minRating: f.minRating === '' ? undefined : Number(f.minRating),
  sortBy: f.sortBy,
  sortOrder: f.sortOrder,
  q: f.q.trim() || undefined,
});

export default function SearchPage() {
  // The landing page links here with ?city=&maxPrice=&q= ; those seed the initial state.
  const [urlParams] = useSearchParams();
  const initialCity = (urlParams.get('city') ?? 'delhi').toLowerCase();
  const [cityInput, setCityInput] = useState(titleCase(initialCity));
  const [city, setCity] = useState(initialCity);
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    minPrice: urlParams.get('minPrice') ?? '',
    maxPrice: urlParams.get('maxPrice') ?? '',
    q: urlParams.get('q') ?? '',
  });
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<Hotel | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debounced = useDebounced(filters);
  const rangeError = priceRangeError(filters);
  // While the range is invalid keep the last valid query instead of sending a request that will 400.
  const lastValid = useRef<Filters>(DEFAULT_FILTERS);
  if (!rangeError) lastValid.current = debounced;
  const validFilters = rangeError ? lastValid.current : debounced;
  const params = useMemo(() => toParams(city, validFilters), [city, validFilters]);

  const cities = useCities();
  const hotels = useHotels(params);
  const refresh = useRefreshHotels();
  const meta = hotels.data?.meta;

  const submitCity = (event: FormEvent) => {
    event.preventDefault();
    const next = cityInput.trim().toLowerCase();
    if (next) setCity(next);
  };

  const onRefresh = () =>
    refresh.mutate(params, {
      onSuccess: (data) => toast.success(`Refreshed ${titleCase(city)}`, { description: `Aggregated ${data.meta.totalHotels} hotels${data.meta.degraded ? ' (partial: a supplier failed)' : ''}.` }),
      onError: (error) => toast.error('Refresh failed', { description: error.message }),
    });

  const cityCenter = useMemo<[number, number] | undefined>(() => {
    const info = meta?.cityInfo;
    return info ? [info.latitude, info.longitude] : undefined;
  }, [meta?.cityInfo]);

  const failedSuppliers = meta ? Object.entries(meta.supplierStatus).filter(([, s]) => s === 'failed').map(([k]) => (k === 'supplierA' ? 'Supplier A' : 'Supplier B')) : [];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Hotel search</p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Stays in {titleCase(city)}</h1>
        </div>
        <WeatherCard city={city} />
      </header>

      <form onSubmit={submitCity} className="mt-8 flex flex-col gap-3 border-y border-navy-900 py-3 sm:flex-row sm:items-center" role="search">
        <label className="relative flex-1">
          <span className="sr-only">City</span>
          <Search className="pointer-events-none absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-500" aria-hidden />
          <input className="w-full bg-transparent py-2 pl-8 pr-2 text-lg outline-none placeholder:text-navy-400" placeholder="Search a city: Delhi, Goa, Jaipur…" list="city-options" value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
          <datalist id="city-options">{cities.data?.data.map((c) => <option key={c.slug} value={c.label} />)}</datalist>
        </label>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {cities.data?.data.map((c) => (
          <button key={c.slug} onClick={() => { setCityInput(c.label); setCity(c.slug); }} className={cn('border-b pb-0.5 transition', c.slug === city ? 'border-terracotta font-medium text-navy-900' : 'border-transparent text-navy-500 hover:text-navy-900')}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[250px_1fr]">
        <aside>
          <button className="mb-4 inline-flex items-center gap-2 text-sm font-medium lg:hidden" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> {filtersOpen ? 'Hide filters' : 'Filters & sorting'}
          </button>
          <div className={cn('lg:sticky lg:top-24 lg:block', filtersOpen ? 'block' : 'hidden')}>
            <FiltersBar filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <section aria-live="polite" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 pb-4">
            <p className="text-sm text-navy-500">
              {meta ? (
                <>
                  <strong className="text-base font-semibold text-navy-900">{meta.filteredHotels}</strong> of {meta.totalHotels} hotels
                  <span className="mx-2 text-navy-300">|</span>
                  {meta.cache === 'HIT' ? 'From cache' : 'Freshly aggregated'}, updated {timeAgo(meta.lastUpdated)}
                </>
              ) : (
                'Loading…'
              )}
            </p>
            <div className="flex items-center gap-3">
              <div className="inline-flex overflow-hidden rounded-md border border-navy-200" role="group" aria-label="View">
                {(['list', 'map'] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-sm', view === v ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 hover:bg-navy-50')}>
                    {v === 'list' ? <List className="h-4 w-4" aria-hidden /> : <MapIcon className="h-4 w-4" aria-hidden />}
                    {v === 'list' ? 'List' : 'Map'}
                  </button>
                ))}
              </div>
              <Button variant="secondary" loading={refresh.isPending} onClick={onRefresh} icon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>
          </div>

          {meta?.degraded && (
            <div className="mt-4 flex items-start gap-3 border-l-2 border-terracotta bg-brand-50 p-4 text-sm text-navy-800" role="status">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              <p><strong>Partial results.</strong> {failedSuppliers.join(' and ')} could not be reached, so only the other supplier’s offers are shown. Refresh in a moment to retry.</p>
            </div>
          )}

          <div className="mt-6">
            {hotels.isError ? (
              <ErrorState message={hotels.error.message} onRetry={() => void hotels.refetch()} />
            ) : hotels.isLoading ? (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <HotelCardSkeleton key={i} />)}</div>
            ) : hotels.data && hotels.data.data.length === 0 ? (
              <EmptyState
                title={meta && meta.totalHotels === 0 ? `No hotels found in ${titleCase(city)}` : 'No hotels match your filters'}
                message={meta && meta.totalHotels === 0 ? 'Neither supplier lists properties here yet. Try Delhi, Mumbai, Bangalore, Jaipur, Goa or Hyderabad.' : 'Try widening the price range or clearing a filter.'}
                action={meta && meta.totalHotels > 0 ? <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button> : undefined}
              />
            ) : hotels.data && view === 'map' ? (
              <div className="overflow-hidden rounded-lg border border-navy-100"><HotelMap hotels={hotels.data.data} center={cityCenter} /></div>
            ) : (
              <div className={cn('grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3', hotels.isFetching && 'opacity-70 transition-opacity')}>
                {hotels.data?.data.map((hotel, i) => <HotelCard key={hotel.slug} hotel={hotel} index={i} onViewOffers={setSelected} />)}
              </div>
            )}
          </div>
        </section>
      </div>

      {selected && <OffersModal hotel={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
