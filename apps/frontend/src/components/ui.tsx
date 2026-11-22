import clsx from 'clsx';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { SupplierName } from '../types';

export const cn = clsx;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 focus-visible:ring-navy-900',
  secondary: 'border border-navy-200 bg-white text-navy-900 hover:border-navy-900 focus-visible:ring-navy-900',
  ghost: 'text-navy-700 hover:bg-navy-100 focus-visible:ring-navy-900',
  danger: 'border border-brand-500/40 bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:ring-brand-500',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', loading, icon, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        buttonStyles[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
      <div>
        <h3 className="font-serif text-xl text-navy-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = 'neutral' | 'brand' | 'saving' | 'warn' | 'danger' | 'amber';
const tones: Record<Tone, string> = {
  neutral: 'bg-navy-100 text-navy-700',
  brand: 'bg-navy-900/[0.07] text-navy-900',
  saving: 'bg-saving-50 text-saving-700',
  warn: 'bg-brand-50 text-brand-700',
  danger: 'bg-red-50 text-red-700',
  amber: 'bg-brand-50 text-brand-700',
};

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>{children}</span>;
}

export const SupplierBadge = ({ supplier }: { supplier: SupplierName }) => <Badge tone={supplier === 'Supplier A' ? 'brand' : 'warn'}>{supplier}</Badge>;

export const SUPPLIER_COLORS: Record<SupplierName, string> = { 'Supplier A': '#172C35', 'Supplier B': '#C87952' };

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function StatCard({ label, value, hint, icon, tone = 'brand' }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: 'brand' | 'saving' | 'amber' }) {
  const toneClass = { brand: 'bg-brand-50 text-brand-600', saving: 'bg-saving-50 text-saving-600', amber: 'bg-amber-50 text-amber-600' }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-navy-500">{label}</p>
        <span className={cn('grid h-9 w-9 place-items-center rounded-md', toneClass)}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
    </Card>
  );
}

export function StatSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </Card>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-navy-100 text-navy-500">
        <Inbox className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center border-red-100 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-navy-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl text-navy-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatusDot({ status }: { status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' }) {
  const color = { healthy: 'bg-olive', unhealthy: 'bg-terracotta', degraded: 'bg-amber-500', unknown: 'bg-navy-300' }[status];
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full', color)} />;
}
