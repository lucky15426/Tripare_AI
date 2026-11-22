import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { useMetrics, useWorkflows } from '../hooks/queries';
import type { WorkflowRun, WorkflowStep } from '../types';
import { formatMs, timeAgo, titleCase } from '../utils/format';

const STEP_LABEL: Record<WorkflowStep['name'], string> = {
  supplierA: 'Supplier A activity',
  supplierB: 'Supplier B activity',
  enrichCity: 'City enrichment (optional)',
  normalize: 'Normalization (names, prices)',
  aggregate: 'Aggregation + deduplication',
  saveToRedis: 'Redis storage',
};
const STEP_ORDER: WorkflowStep['name'][] = ['supplierA', 'supplierB', 'enrichCity', 'normalize', 'aggregate', 'saveToRedis'];
const STEP_COLOR: Record<WorkflowStep['name'], string> = { supplierA: 'bg-navy-900', supplierB: 'bg-terracotta', enrichCity: 'bg-navy-300', normalize: 'bg-olive', aggregate: 'bg-navy-700', saveToRedis: 'bg-saving-700' };

function Timeline({ run }: { run: WorkflowRun }) {
  const total = Math.max(run.durationMs, ...run.steps.map((s) => s.startOffsetMs + s.durationMs), 1);
  const steps = [...run.steps].sort((a, b) => STEP_ORDER.indexOf(a.name) - STEP_ORDER.indexOf(b.name));
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-navy-800">
              {STEP_LABEL[step.name]}
              {step.attempts !== undefined && <span className="ml-2 text-navy-400">{step.attempts} attempt{step.attempts === 1 ? '' : 's'}</span>}
            </span>
            <span className="flex items-center gap-2 text-navy-500">
              {formatMs(step.durationMs)}
              <Badge tone={step.status === 'success' ? 'saving' : 'danger'}>{step.status}</Badge>
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-navy-100">
            <div
              className={`absolute top-0 h-2.5 rounded-full ${step.status === 'failed' ? 'bg-brand-700 ring-2 ring-brand-700/30' : STEP_COLOR[step.name]}`}
              style={{ left: `${(step.startOffsetMs / total) * 100}%`, width: `${Math.max((step.durationMs / total) * 100, 1.5)}%` }}
              title={`starts +${step.startOffsetMs}ms, takes ${step.durationMs}ms`}
            />
          </div>
          {step.error && <p className="mt-1 text-xs text-brand-700">{step.error}</p>}
        </div>
      ))}
      <p className="pt-1 text-xs text-navy-400">Bars are positioned by offset from workflow start (total {formatMs(total)}). Overlapping supplier bars show the concurrent fan-out.</p>
    </div>
  );
}

export default function WorkflowsPage() {
  const workflows = useWorkflows();
  const metrics = useMetrics();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const runs = workflows.data?.data ?? [];
  const selected = runs.find((r) => r.workflowId === selectedId) ?? runs[0];
  const m = metrics.data?.data;

  return (
    <>
      <PageHeader title="Workflow Monitoring" subtitle="Executions of hotelOfferWorkflow recorded by the API from real Temporal results." />

      <dl className="grid grid-cols-1 divide-y divide-navy-100 border-y border-navy-900 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[['Workflow executions', String(m?.workflowExecutions ?? 0), 'recorded by the API'], ['Average duration', formatMs(m?.avgWorkflowDurationMs), 'start to Redis write'], ['Failed workflows', String(m?.workflowFailures ?? 0), 'every supplier was down']].map(([label, value, hint]) => (
          <div key={label} className="py-5 sm:px-6 sm:first:pl-0">
            <dt className="label !mb-2">{label}</dt>
            <dd className="font-serif text-4xl leading-none">{value}</dd>
            <dd className="mt-2 text-sm text-navy-500">{hint}</dd>
          </div>
        ))}
      </dl>

      {workflows.isError ? (
        <div className="mt-6"><ErrorState message={workflows.error.message} onRetry={() => void workflows.refetch()} /></div>
      ) : workflows.isLoading ? (
        <Skeleton className="mt-6 h-72" />
      ) : runs.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No workflow executions yet" message="A workflow runs whenever a search misses the Redis cache (or is refreshed). Search for a city to trigger one." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          <Card className="overflow-hidden xl:col-span-3">
            <CardHeader title="Recent executions" subtitle="Newest first. Click a row for its timeline." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="px-4 py-2.5">Workflow ID</th>
                    <th className="px-4 py-2.5">City</th>
                    <th className="px-4 py-2.5">Started</th>
                    <th className="px-4 py-2.5">Duration</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {runs.map((run) => (
                    <tr key={run.workflowId} onClick={() => setSelectedId(run.workflowId)} className={`cursor-pointer transition hover:bg-navy-50 ${selected?.workflowId === run.workflowId ? 'bg-brand-50/60' : ''}`}>
                      <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs" title={run.workflowId}>{run.workflowId.replace('hotel-offers-', '')}</td>
                      <td className="px-4 py-3">{titleCase(run.city)}</td>
                      <td className="px-4 py-3 text-navy-500">{timeAgo(run.startedAt)}</td>
                      <td className="px-4 py-3">{formatMs(run.durationMs)}</td>
                      <td className="px-4 py-3"><Badge tone={run.status === 'COMPLETED' ? 'saving' : 'danger'}>{run.status}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-navy-500">{run.trigger === 'refresh' ? 'Refresh (bypass)' : 'Cache miss'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {selected && (
            <Card className="xl:col-span-2">
              <CardHeader title={`${titleCase(selected.city)} execution`} subtitle={selected.workflowId} action={<a href={selected.temporalUiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">Temporal UI <ExternalLink className="h-3 w-3" /></a>} />
              <div className="space-y-4 px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={selected.status === 'COMPLETED' ? 'saving' : 'danger'}>{selected.status}</Badge>
                  <Badge>{selected.hotels} hotels</Badge>
                  {selected.supplierStatus && (['supplierA', 'supplierB'] as const).map((k) => <Badge key={k} tone={selected.supplierStatus?.[k] === 'success' ? 'saving' : 'danger'}>{k === 'supplierA' ? 'A' : 'B'}: {selected.supplierStatus?.[k]}</Badge>)}
                </div>
                <Timeline run={selected} />
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
