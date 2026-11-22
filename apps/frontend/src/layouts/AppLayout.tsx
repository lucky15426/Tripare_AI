import { Activity, BarChart3, LayoutDashboard, Search, ServerCog } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn, StatusDot } from '../components/ui';
import { useCurrency } from '../hooks/CurrencyContext';
import { useHealth } from '../hooks/queries';
import type { Currency } from '../types';
import { CURRENCIES } from '../utils/format';
import { Logo } from './MarketingLayout';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/suppliers', label: 'Suppliers', icon: ServerCog },
  { to: '/workflows', label: 'Workflows', icon: Activity },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

function HealthPill() {
  const { data, isError, isLoading } = useHealth();
  const status = isLoading ? 'unknown' : isError ? 'unhealthy' : (data?.status ?? 'unknown');
  const label = isError ? 'API offline' : isLoading ? 'Checking…' : { healthy: 'All systems healthy', degraded: 'Degraded', unhealthy: 'Unhealthy', unknown: 'Unknown' }[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-navy-700" title={data ? JSON.stringify(data.services) : undefined}>
      <StatusDot status={status} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function CurrencySelect() {
  const { currency, setCurrency, ratesAvailable, rateDate } = useCurrency();
  return (
    <label className="flex items-center gap-2 text-xs text-navy-500" title={ratesAvailable ? `Frankfurter rates, ${rateDate}. Display only; supplier prices are INR.` : 'Live exchange rates unavailable; showing INR'}>
      <span className="hidden sm:inline">Currency</span>
      <select className="rounded-md border border-navy-200 bg-white px-2 py-1 text-sm font-medium text-navy-900 outline-none focus:border-navy-900 disabled:opacity-60" value={currency} disabled={!ratesAvailable} onChange={(e) => setCurrency(e.target.value as Currency)} aria-label="Display currency">
        {CURRENCIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen lg:pl-56">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-navy-900 px-4 py-6 text-ivory lg:flex">
        <div className="px-2"><Logo light /></div>
        <nav className="mt-10 flex flex-col gap-0.5" aria-label="Workspace">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm transition', isActive ? 'bg-white/10 text-white' : 'text-ivory/60 hover:bg-white/5 hover:text-white')}>
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4', isActive && 'text-terracotta')} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/" className="mt-auto px-3 text-xs text-ivory/50 hover:text-white">← Back to site</NavLink>
      </aside>

      <header className="sticky top-0 z-20 border-b border-navy-100 bg-ivory/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-8">
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto flex items-center gap-5">
            <HealthPill />
            <CurrencySelect />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="Workspace">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium', isActive ? 'bg-navy-900 text-white' : 'text-navy-500')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
