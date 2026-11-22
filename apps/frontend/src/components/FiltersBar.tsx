import { FilterX } from 'lucide-react';
import { useCurrency } from '../hooks/CurrencyContext';
import type { SupplierName } from '../types';
import { cn } from './ui';

export const SLIDER_MAX = 15000;
export const SLIDER_STEP = 500;

export interface Filters {
  minPrice: string;
  maxPrice: string;
  supplier: SupplierName | '';
  minRating: string;
  sortBy: 'price' | 'rating' | 'commission';
  sortOrder: 'asc' | 'desc';
  q: string;
}

export const DEFAULT_FILTERS: Filters = { minPrice: '', maxPrice: '', supplier: '', minRating: '', sortBy: 'price', sortOrder: 'asc', q: '' };

export const priceRangeError = (f: Filters): string | null => {
  const min = f.minPrice === '' ? null : Number(f.minPrice);
  const max = f.maxPrice === '' ? null : Number(f.maxPrice);
  if ((min !== null && (Number.isNaN(min) || min < 0)) || (max !== null && (Number.isNaN(max) || max < 0))) return 'Prices must be positive numbers';
  if (min !== null && max !== null && min > max) return 'Minimum price cannot exceed maximum price';
  return null;
};

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="border-t border-navy-100 py-5 first:border-t-0 first:pt-0">
    <legend className="label float-left w-full">{title}</legend>
    <div className="clear-both">{children}</div>
  </fieldset>
);

function Choice({ checked, onChange, children, name }: { checked: boolean; onChange: () => void; children: React.ReactNode; name: string }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 py-1 text-sm', checked ? 'font-medium text-navy-900' : 'text-navy-500 hover:text-navy-900')}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-navy-900" />
      {children}
    </label>
  );
}

export default function FiltersBar({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  const { format } = useCurrency();
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const sliderMin = filters.minPrice === '' ? 0 : Math.min(Number(filters.minPrice) || 0, SLIDER_MAX);
  const sliderMax = filters.maxPrice === '' ? SLIDER_MAX : Math.min(Number(filters.maxPrice) || 0, SLIDER_MAX);
  const error = priceRangeError(filters);
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div>
      <Group title="Hotel name">
        <input className="input" placeholder="Search by name" value={filters.q} onChange={(e) => set('q', e.target.value)} aria-label="Hotel name" />
      </Group>

      <Group title="Price per night (INR)">
        <div className="flex items-center gap-2">
          <input className="input" type="number" min={0} inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={filters.minPrice} onChange={(e) => set('minPrice', e.target.value)} />
          <span className="text-navy-400">–</span>
          <input className="input" type="number" min={0} inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={filters.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
        </div>
        <div className="mt-4 space-y-3">
          <input type="range" aria-label="Minimum price slider" min={0} max={SLIDER_MAX} step={SLIDER_STEP} value={sliderMin} onChange={(e) => set('minPrice', Number(e.target.value) === 0 ? '' : e.target.value)} />
          <input type="range" aria-label="Maximum price slider" min={0} max={SLIDER_MAX} step={SLIDER_STEP} value={sliderMax} onChange={(e) => set('maxPrice', Number(e.target.value) === SLIDER_MAX ? '' : e.target.value)} />
        </div>
        <p className="mt-2 text-xs text-navy-500">
          {format(sliderMin)} – {sliderMax >= SLIDER_MAX ? `${format(SLIDER_MAX)}+` : format(sliderMax)}
        </p>
        {error && <p className="mt-2 text-xs font-medium text-brand-700" role="alert">{error}</p>}
      </Group>

      <Group title="Supplier">
        {([['', 'All suppliers'], ['Supplier A', 'Supplier A'], ['Supplier B', 'Supplier B']] as const).map(([value, label]) => (
          <Choice key={label} name="supplier" checked={filters.supplier === value} onChange={() => set('supplier', value)}>{label}</Choice>
        ))}
      </Group>

      <Group title="Minimum rating">
        {([['', 'Any rating'], ['3.5', '3.5 and up'], ['4', '4.0 and up'], ['4.5', '4.5 and up']] as const).map(([value, label]) => (
          <Choice key={label} name="rating" checked={filters.minRating === value} onChange={() => set('minRating', value)}>{label}</Choice>
        ))}
      </Group>

      <Group title="Sort by">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" aria-label="Sort by" value={filters.sortBy} onChange={(e) => set('sortBy', e.target.value as Filters['sortBy'])}>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
            <option value="commission">Commission</option>
          </select>
          <select className="input" aria-label="Sort order" value={filters.sortOrder} onChange={(e) => set('sortOrder', e.target.value as Filters['sortOrder'])}>
            <option value="asc">Low to high</option>
            <option value="desc">High to low</option>
          </select>
        </div>
      </Group>

      <button disabled={!dirty} onClick={() => onChange(DEFAULT_FILTERS)} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-900 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline">
        <FilterX className="h-4 w-4" aria-hidden /> Clear filters
      </button>
    </div>
  );
}
