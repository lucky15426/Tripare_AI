import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useCurrency } from '../hooks/CurrencyContext';
import type { Analytics, WorkflowRun } from '../types';
import { formatMs } from '../utils/format';
import { axisProps, ChartCard, COLORS, tooltipStyle } from './common';

/** Per-hotel price from each supplier, for hotels offered by both (the ones where comparison matters). */
export function PriceComparisonChart({ analytics, city, loading }: { analytics?: Analytics; city: string; loading: boolean }) {
  const { format, compact } = useCurrency();
  const rows = (analytics?.hotels ?? [])
    .filter((h) => h.city === city && h.offers.length > 1)
    .map((h) => ({
      name: h.name,
      'Supplier A': h.offers.find((o) => o.supplier === 'Supplier A')?.price,
      'Supplier B': h.offers.find((o) => o.supplier === 'Supplier B')?.price,
    }));
  return (
    <ChartCard title="Hotel prices comparison" subtitle="Hotels listed by both suppliers" loading={loading} empty={rows.length === 0}>
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="name" {...axisProps} interval={0} tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
        <YAxis {...axisProps} width={56} tickFormatter={(v: number) => compact(v)} />
        <Tooltip {...tooltipStyle} formatter={(v) => format(Number(v))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Supplier A" fill={COLORS.a} radius={[6, 6, 0, 0]} />
        <Bar dataKey="Supplier B" fill={COLORS.b} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function SupplierShareChart({ analytics, loading }: { analytics?: Analytics; loading: boolean }) {
  const wins = analytics?.totals.supplierWins;
  const data = wins ? [{ name: 'Supplier A', value: wins['Supplier A'], fill: COLORS.a }, { name: 'Supplier B', value: wins['Supplier B'], fill: COLORS.b }] : [];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard title="Hotels by supplier" subtitle="Which supplier holds the best price" loading={loading} empty={total === 0}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
      </PieChart>
    </ChartCard>
  );
}

export function PriceDistributionChart({ analytics, loading }: { analytics?: Analytics; loading: boolean }) {
  const data = analytics?.priceDistribution ?? [];
  return (
    <ChartCard title="Price distribution" subtitle="Cheapest price per hotel, all cities" loading={loading} empty={data.every((d) => d.count === 0)}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="range" {...axisProps} />
        <YAxis {...axisProps} width={32} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v} hotels`, 'Count']} />
        <Bar dataKey="count" fill={COLORS.a} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

/** Supplier latency taken from the real activity timings of recent workflow runs (oldest -> newest). */
export function ResponseTimeChart({ runs, loading }: { runs?: WorkflowRun[]; loading: boolean }) {
  const data = [...(runs ?? [])]
    .filter((r) => r.status === 'COMPLETED')
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      run: r.city.slice(0, 3).toUpperCase(),
      'Supplier A': r.steps.find((s) => s.name === 'supplierA' && s.status === 'success')?.durationMs,
      'Supplier B': r.steps.find((s) => s.name === 'supplierB' && s.status === 'success')?.durationMs,
    }));
  return (
    <ChartCard title="Supplier response time" subtitle="Activity duration of the last workflow runs" loading={loading} empty={data.length === 0}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis dataKey="run" {...axisProps} />
        <YAxis {...axisProps} width={48} tickFormatter={(v: number) => formatMs(v)} />
        <Tooltip {...tooltipStyle} formatter={(v) => formatMs(Number(v))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Supplier A" fill={COLORS.a} radius={[6, 6, 0, 0]} />
        <Bar dataKey="Supplier B" fill={COLORS.b} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}
