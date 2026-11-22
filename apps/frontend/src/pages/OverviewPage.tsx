import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PriceComparisonChart, ResponseTimeChart } from '../charts/OverviewCharts';
import { COLORS } from '../charts/common';
import { Badge, ErrorState, PageHeader, Skeleton, StatusDot } from '../components/ui';
import { useCurrency } from '../hooks/CurrencyContext';
import { useAnalytics, useMetrics, useRecentSearches, useSuppliers, useWorkflows } from '../hooks/queries';
import { formatMs, formatPercent, timeAgo, titleCase } from '../utils/format';
import { hotelImage } from '../utils/images';

function Metric({ label, value, hint, loading, tone }: { label: string; value: string; hint?: string; loading?: boolean; tone?: 'saving' }) {
  return (
    <div className="px-0 py-5 sm:px-6 sm:first:pl-0">
      <p className="label !mb-2">{label}</p>
      {loading ? <Skeleton className="h-10 w-32" /> : <p className={`font-serif text-4xl leading-none ${tone === 'saving' ? 'text-saving-700' : ''}`}>{value}</p>}
      {hint && <p className="mt-2 text-sm text-navy-500">{hint}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const { format } = useCurrency();
  const analytics = useAnalytics();
  const metrics = useMetrics();
  const suppliers = useSuppliers();
  const workflows = useWorkflows();
  const recent = useRecentSearches();
  const [chartCity, setChartCity] = useState('delhi');

  const totals = analytics.data?.totals;
  const wins = totals?.supplierWins;
  const winTotal = wins ? wins['Supplier A'] + wins['Supplier B'] : 0;
  const topDeals = (analytics.data?.hotels ?? []).filter((h) => h.savings > 0).sort((a, b) => b.savings - a.savings).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="What the suppliers are offering right now, and how the system is behaving."
        actions={<Link to="/search" className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">Search hotels <ArrowRight className="h-4 w-4" /></Link>}
      />

      {analytics.isError ? (
        <ErrorState message={analytics.error.message} onRetry={() => void analytics.refetch()} />
      ) : (
        <div className="grid divide-y divide-navy-100 border-y border-navy-900 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <Metric loading={analytics.isLoading} label="Hotels compared" value={String(totals?.hotels ?? 0)} hint={`${totals?.comparedHotels ?? 0} listed by both suppliers`} />
          <Metric loading={analytics.isLoading} label="Lowest nightly price" value={totals?.lowestPrice != null ? format(totals.lowestPrice) : '–'} hint={`${format(totals?.averagePrice ?? 0)} on average`} />
          <Metric loading={analytics.isLoading} tone="saving" label="Savings available" value={format(totals?.totalSavings ?? 0)} hint="per night, by picking the cheapest supplier" />
          <Metric loading={metrics.isLoading} label="Cache hit rate" value={formatPercent(metrics.data?.data.cacheHitRatio ?? null)} hint={`${metrics.data?.data.cacheHits ?? 0} hits, ${metrics.data?.data.workflowExecutions ?? 0} workflows run`} />
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="font-serif text-2xl">Biggest savings</h2>
          <p className="mt-1 text-sm text-navy-500">Hotels where choosing the cheapest supplier matters most.</p>
          <ul className="mt-4 divide-y divide-navy-100 border-y border-navy-100">
            {analytics.isLoading
              ? Array.from({ length: 4 }, (_, i) => <li key={i} className="py-3"><Skeleton className="h-14" /></li>)
              : topDeals.length === 0 ? <li className="py-6 text-sm text-navy-500">No price differences yet.</li>
              : topDeals.map((h) => (
                    <li key={`${h.city}-${h.name}`}>
                      <Link to={`/search?city=${h.city}&q=${encodeURIComponent(h.name)}`} className="group flex items-center gap-4 py-3">
                        <img src={hotelImage(h.name, 160, 120)} alt="" loading="lazy" className="h-14 w-[4.5rem] shrink-0 rounded-md object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-lg group-hover:underline">{h.name}</p>
                          <p className="text-sm text-navy-500">{titleCase(h.city)} · best via {h.supplier}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{format(h.price)}</p>
                          <p className="text-sm font-medium text-saving-700">Save {format(h.savings)}</p>
                        </div>
                      </Link>
                    </li>
                ))}
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl">Suppliers</h2>
          <p className="mt-1 text-sm text-navy-500">Live health and who holds the best price.</p>
          <div className="mt-4 divide-y divide-navy-100 border-y border-navy-100">
            {suppliers.isLoading
              ? [0, 1].map((i) => <Skeleton key={i} className="my-3 h-12" />)
              : suppliers.data?.data.map((s) => (
                  <div key={s.key} className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="flex items-center gap-2 font-medium"><StatusDot status={s.status} /> {s.name}</p>
                      <p className="mt-0.5 text-sm text-navy-500">{totals?.supplierWins[s.name] ?? 0} best prices · {formatMs(s.avgResponseMs)} avg</p>
                    </div>
                    <Badge tone={s.status === 'healthy' ? 'saving' : 'danger'}>{s.status === 'healthy' ? 'Operational' : 'Down'}</Badge>
                  </div>
                ))}
          </div>
          {winTotal > 0 && wins && (
            <div className="mt-5">
              <p className="label">Best price share</p>
              <div className="flex h-2 overflow-hidden rounded-full bg-navy-100" role="img" aria-label={`Supplier A ${wins['Supplier A']}, Supplier B ${wins['Supplier B']}`}>
                <div style={{ width: `${(wins['Supplier A'] / winTotal) * 100}%`, background: COLORS.a }} />
                <div style={{ width: `${(wins['Supplier B'] / winTotal) * 100}%`, background: COLORS.b }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-navy-500"><span>Supplier A · {wins['Supplier A']}</span><span>Supplier B · {wins['Supplier B']}</span></div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-navy-500">
            <label htmlFor="chart-city">City</label>
            <select id="chart-city" className="input !w-auto !py-1" value={chartCity} onChange={(e) => setChartCity(e.target.value)}>
              {analytics.data?.cities.map((c) => <option key={c.city} value={c.city}>{c.label}</option>) ?? <option value="delhi">Delhi</option>}
            </select>
          </div>
          <PriceComparisonChart analytics={analytics.data} city={chartCity} loading={analytics.isLoading} />
        </div>
        <div className="lg:pt-[2.6rem]"><ResponseTimeChart runs={workflows.data?.data} loading={workflows.isLoading} /></div>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between"><h2 className="font-serif text-2xl">Workflow activity</h2><Link to="/workflows" className="text-sm underline-offset-4 hover:underline">All executions</Link></div>
          <table className="mt-4 w-full text-left text-sm">
            <tbody className="divide-y divide-navy-100 border-y border-navy-100">
              {workflows.data?.data.slice(0, 5).map((r) => (
                <tr key={r.workflowId}>
                  <td className="py-2.5 font-medium">{titleCase(r.city)}</td>
                  <td className="py-2.5 text-navy-500">{r.trigger === 'refresh' ? 'Refresh' : 'Cache miss'}</td>
                  <td className="py-2.5 text-navy-500">{formatMs(r.durationMs)}</td>
                  <td className="py-2.5 text-right"><Badge tone={r.status === 'COMPLETED' ? 'saving' : 'danger'}>{r.status === 'COMPLETED' ? 'Completed' : 'Failed'}</Badge></td>
                </tr>
              )) ?? null}
              {workflows.data && workflows.data.data.length === 0 && <tr><td className="py-4 text-navy-500">No executions yet.</td></tr>}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="font-serif text-2xl">Recent searches</h2>
          <ul className="mt-4 divide-y divide-navy-100 border-y border-navy-100 text-sm">
            {recent.data?.data.slice(0, 5).map((s, i) => (
              <li key={`${s.at}-${i}`} className="flex items-center justify-between py-2.5">
                <Link to={`/search?city=${s.city}`} className="font-medium hover:underline">{titleCase(s.city)}</Link>
                <span className="text-navy-500">{s.results} results · {s.cache === 'HIT' ? 'cached' : 'aggregated'} · {timeAgo(s.at)}</span>
              </li>
            ))}
            {recent.data && recent.data.data.length === 0 && <li className="py-4 text-navy-500">No searches yet.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
