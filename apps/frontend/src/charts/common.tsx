import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Skeleton } from '../components/ui';

export const COLORS = { a: '#172C35', b: '#C87952', saving: '#74816A', neutral: '#98a0a1', grid: '#e8e3d6', axis: '#6D7477' } as const;

export const axisProps = { tick: { fill: COLORS.axis, fontSize: 12 }, tickLine: false, axisLine: false } as const;

export const tooltipStyle = {
  contentStyle: { borderRadius: 6, border: '1px solid #e8e3d6', boxShadow: 'none', fontSize: 12 },
  cursor: { fill: 'rgba(23,44,53,0.05)' },
} as const;

export function ChartCard({ title, subtitle, loading, empty, height = 280, children }: { title: string; subtitle?: string; loading?: boolean; empty?: boolean; height?: number; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="font-serif text-xl">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>}
      <div className="mt-4" style={{ height }}>
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <div className="grid h-full place-items-center border border-dashed border-navy-200 text-sm text-navy-400">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as never}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
