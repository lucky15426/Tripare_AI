import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../services/api';
import { cn } from '../components/ui';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="StaySync home">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="6" fill={light ? '#F4F1E9' : '#172C35'} />
        <path d="M7 21l5-10 4 7 3-4 6 7z" fill="#C87952" />
      </svg>
      <span className={cn('font-serif text-xl tracking-tight', light ? 'text-ivory' : 'text-navy-900')}>StaySync</span>
    </Link>
  );
}

const LINKS = [
  { label: 'Explore', to: '/search' },
  { label: 'Destinations', to: '/#destinations' },
  { label: 'How it works', to: '/#how-it-works' },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const solid = scrolled || open;
  return (
    <header className={cn('fixed inset-x-0 top-0 z-40 transition-colors duration-300', solid ? 'border-b border-navy-100 bg-ivory/95 backdrop-blur' : 'bg-transparent')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo light={!solid} />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to} className={cn('text-sm transition-colors', solid ? 'text-navy-700 hover:text-navy-900' : 'text-ivory/85 hover:text-white')}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {/* The demo has no accounts: "Sign in" opens the workspace directly. */}
          <Link to="/dashboard" className={cn('px-3 py-2 text-sm', solid ? 'text-navy-700 hover:text-navy-900' : 'text-ivory/85 hover:text-white')}>
            Sign in
          </Link>
          <Link to="/search" className="rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
            Start comparing
          </Link>
        </div>
        <button className={cn('md:hidden', solid ? 'text-navy-900' : 'text-ivory')} onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-navy-100 bg-ivory px-5 pb-5 md:hidden">
          {[...LINKS, { label: 'Sign in', to: '/dashboard' }].map((l) => (
            <Link key={l.label} to={l.to} className="block border-b border-navy-100 py-3 text-navy-900">
              {l.label}
            </Link>
          ))}
          <Link to="/search" className="mt-4 block rounded-md bg-terracotta px-4 py-3 text-center font-medium text-white">
            Start comparing
          </Link>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const col = 'space-y-2.5 text-sm text-ivory/70';
  const link = 'hover:text-white';
  return (
    <footer className="border-t border-white/10 bg-navy-900 text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/70">Compare hotel offers across suppliers and find the best price for your next trip.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-8">
          <div>
            <p className="eyebrow !text-ivory/50">Product</p>
            <ul className={cn(col, 'mt-4')}>
              {[['Search hotels', '/search'], ['Dashboard', '/dashboard'], ['Suppliers', '/suppliers'], ['Workflows', '/workflows'], ['Analytics', '/analytics']].map(([l, t]) => (
                <li key={t}><Link className={link} to={t as string}>{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow !text-ivory/50">Destinations</p>
            <ul className={cn(col, 'mt-4')}>
              {['Delhi', 'Mumbai', 'Bangalore', 'Jaipur', 'Goa', 'Hyderabad'].map((c) => (
                <li key={c}><Link className={link} to={`/search?city=${c.toLowerCase()}`}>{c}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow !text-ivory/50">Project</p>
            <ul className={cn(col, 'mt-4')}>
              <li>Temporal workflows</li>
              <li>Redis price index</li>
              <li>Express + TypeScript</li>
              <li>React + Vite</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow !text-ivory/50">Demo &amp; API</p>
            <ul className={cn(col, 'mt-4')}>
              <li><a className={link} href={`${API_BASE_URL}/health`} target="_blank" rel="noreferrer">API health</a></li>
              <li><a className={link} href={`${API_BASE_URL}/api/hotels?city=delhi`} target="_blank" rel="noreferrer">Sample request</a></li>
              <li>Mock suppliers, INR prices</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-5 py-5 text-xs text-ivory/50 sm:px-8">
          <span>StaySync is a demonstration project. Supplier data is simulated.</span>
          <span>
            Photography via <a className="underline hover:text-white" href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    // let the section mount before scrolling to it
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
    return () => clearTimeout(timer);
  }, [hash, pathname]);

  return (
    <>
      <Nav />
      <Outlet />
      <Footer />
    </>
  );
}
