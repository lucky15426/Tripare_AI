import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { useCurrency } from '../hooks/CurrencyContext';
import type { Analytics } from '../types';
import { axisProps, ChartCard, COLORS, tooltipStyle } from './common';

type Props = { analytics?: Analytics; loading: boolean };

const grid = <CartesianGrid vertical={false} stroke={COLORS.grid} />;

export function LowestPriceChart({ analytics, loading }: Props) {
  const { format, compact } = useCurrency();
  const data = (analytics?.cities ?? []).filter((c) => c.hotels > 0).map((c) => ({ city: c.label, Lowest: c.lowestPrice, Average: c.averagePrice }));
  return (
    <ChartCard title="Lowest vs average price per city" subtitle="Cheapest-offer prices after deduplication" loading={loading} empty={data.length === 0}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="city" {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={(v: number) => compact(v)} />
        <Tooltip {...tooltipStyle} formatter={(v) => format(Number(v))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Lowest" fill={COLORS.saving} radius={[6, 6, 0, 0]} />
        <Bar dataKey="Average" fill={COLORS.a} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function SupplierWinsChart({ analytics, loading }: Props) {
  const data = (analytics?.cities ?? []).filter((c) => c.hotels > 0).map((c) => ({ city: c.label, 'Supplier A': c.supplierWins['Supplier A'], 'Supplier B': c.supplierWins['Supplier B'] }));
  return (
    <ChartCard title="Supplier win distribution" subtitle="Hotels where each supplier has the best price" loading={loading} empty={data.length === 0}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="city" {...axisProps} />
        <YAxis {...axisProps} width={28} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Supplier A" stackId="w" fill={COLORS.a} />
        <Bar dataKey="Supplier B" stackId="w" fill={COLORS.b} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function SavingsChart({ analytics, loading }: Props) {
  const { format, compact } = useCurrency();
  const data = (analytics?.cities ?? []).filter((c) => c.hotels > 0).map((c) => ({ city: c.label, Savings: c.totalSavings }));
  return (
    <ChartCard title="Price savings by city" subtitle="Total saved per night by choosing the cheapest supplier" loading={loading} empty={data.length === 0}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="city" {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={(v: number) => compact(v)} />
        <Tooltip {...tooltipStyle} formatter={(v) => format(Number(v))} />
        <Bar dataKey="Savings" fill={COLORS.saving} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function PriceHistogramChart({ analytics, loading }: Props) {
  const data = analytics?.priceDistribution ?? [];
  return (
    <ChartCard title="Hotel price distribution" subtitle="Number of hotels per price band (all cities)" loading={loading} empty={data.every((d) => d.count === 0)}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="range" {...axisProps} />
        <YAxis {...axisProps} width={28} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v} hotels`, 'Count']} />
        <Bar dataKey="count" fill={COLORS.a} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function CommissionChart({ analytics, loading }: Props) {
  const data = (analytics?.commission ?? []).map((c) => ({ supplier: c.supplier, 'Avg commission %': c.averageCommissionPct }));
  return (
    <ChartCard title="Commission comparison" subtitle="Average commission across every offer" loading={loading} empty={data.length === 0}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        {grid}
        <XAxis dataKey="supplier" {...axisProps} />
        <YAxis {...axisProps} width={36} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
        <Bar dataKey="Avg commission %" fill={COLORS.a} radius={[6, 6, 0, 0]} barSize={56} />
      </BarChart>
    </ChartCard>
  );
}
