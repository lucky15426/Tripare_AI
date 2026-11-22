import { FlaskConical, RefreshCw, RotateCcw, ServerCrash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, ErrorState, PageHeader, Skeleton, StatusDot } from '../components/ui';
import { useCities, useRefreshHotels, useSimulation, useSuppliers } from '../hooks/queries';
import type { SupplierKey } from '../types';
import { formatMs, formatPercent, timeAgo } from '../utils/format';

export default function SuppliersPage() {
  const suppliers = useSuppliers();
  const cities = useCities();
  const { simulate, reset } = useSimulation();
  const refresh = useRefreshHotels();
  const [city, setCity] = useState('delhi');

  const fail = (key: SupplierKey, name: string) =>
    simulate.mutate(
      { key, body: { enabled: false } },
      { onSuccess: () => toast.warning(`${name} is now simulated as DOWN`, { description: 'Run a fresh aggregation to see the degraded result.' }), onError: (e) => toast.error(e.message) },
    );

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Health probes plus request statistics collected from real workflow executions." />

      {suppliers.isError ? (
        <ErrorState message={suppliers.error.message} onRetry={() => void suppliers.refetch()} />
      ) : suppliers.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-navy-500">
              <tr className="border-b border-navy-900">
                {['Supplier', 'Status', 'Probe response', 'Avg activity time', 'Requests', 'Failures', 'Success rate', 'Last checked'].map((h) => (
                  <th key={h} className="py-3 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.data?.data.map((s) => (
                <tr key={s.key} className="border-b border-navy-100">
                  <td className="py-4 pr-4 font-serif text-lg">{s.name}</td>
                  <td className="py-4 pr-4"><span className="inline-flex items-center gap-2"><StatusDot status={s.status} />{s.status === 'healthy' ? 'Operational' : 'Unavailable'}</span></td>
                  <td className="py-4 pr-4 font-mono text-[13px]">{formatMs(s.responseTimeMs)}</td>
                  <td className="py-4 pr-4 font-mono text-[13px]">{formatMs(s.avgResponseMs)}</td>
                  <td className="py-4 pr-4 font-mono text-[13px]">{s.requests}</td>
                  <td className={`py-4 pr-4 font-mono text-[13px] ${s.failures > 0 ? 'font-semibold text-brand-700' : ''}`}>{s.failures}</td>
                  <td className="py-4 pr-4 font-mono text-[13px]">{formatPercent(s.successRate)}</td>
                  <td className="py-4 pr-4 text-navy-500">{timeAgo(s.lastChecked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-navy-500">Requests and failures count workflow executions (after Temporal retries are exhausted). The table refreshes every few seconds.</p>
        </div>
      )}

      {suppliers.data?.devControls ? (
        <section className="mt-14 border-t border-navy-900 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif text-2xl">Failure simulation</h2>
            <Badge tone="warn"><FlaskConical className="h-3 w-3" /> DEV ONLY</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">These controls change the mocked supplier endpoints, not real systems.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="danger" icon={<ServerCrash className="h-4 w-4" />} loading={simulate.isPending} onClick={() => fail('supplierA', 'Supplier A')}>Simulate Supplier A failure</Button>
            <Button variant="danger" icon={<ServerCrash className="h-4 w-4" />} loading={simulate.isPending} onClick={() => fail('supplierB', 'Supplier B')}>Simulate Supplier B failure</Button>
            <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} loading={reset.isPending} onClick={() => reset.mutate(undefined, { onSuccess: () => toast.success('Both suppliers restored'), onError: (e) => toast.error(e.message) })}>Restore both</Button>
          </div>
          <div className="mt-8 max-w-2xl border-l-2 border-navy-200 pl-5">
            <p className="font-medium">See the effect</p>
            <p className="mt-1 text-sm text-navy-500">Cached cities keep serving until their TTL ends. Force a new aggregation to watch retries, degradation and the metrics change.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="input !w-auto" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City to refresh">
                {cities.data?.data.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
              <Button
                icon={<RefreshCw className="h-4 w-4" />}
                loading={refresh.isPending}
                onClick={() =>
                  refresh.mutate(
                    { city },
                    {
                      onSuccess: (d) => (d.meta.degraded ? toast.warning(`Degraded result for ${city}`, { description: `Supplier A ${d.meta.supplierStatus.supplierA}, Supplier B ${d.meta.supplierStatus.supplierB}` }) : toast.success(`Refreshed ${city}: both suppliers OK`)),
                      onError: (e) => toast.error('Aggregation failed', { description: e.message }),
                    },
                  )
                }
              >
                Run fresh aggregation
              </Button>
            </div>
          </div>
        </section>
      ) : (
        suppliers.data && <p className="mt-10 text-sm text-navy-500">Simulation controls are disabled in this environment.</p>
      )}
    </>
  );
}
