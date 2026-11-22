import { ArrowRight, GitCompareArrows, Search, Wallet, Zap, Layers, RefreshCw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '../motion';

const STEPS = [
  { n: '01', title: 'Search your destination', text: 'Pick a city and, if you like, a nightly budget. Prices are filtered in Redis, so results come back fast.', icon: Search },
  { n: '02', title: 'Compare supplier offers', text: 'Every supplier’s offer for the same hotel is lined up with its commission, and the cheapest one is on top.', icon: GitCompareArrows },
  { n: '03', title: 'Book the best-value stay', text: 'See exactly how much you save against the next offer, then go with the stay that fits.', icon: Wallet },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-lg font-serif text-4xl leading-tight sm:text-5xl">Three steps to a better rate.</h2>
      </Reveal>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {STEPS.map(({ n, title, text, icon: Icon }, i) => (
          <Reveal key={n} delay={i * 0.08} className="border-t border-navy-900 pt-5">
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-5xl text-brand-700">{n}</span>
              <Icon className="h-5 w-5 text-navy-500" aria-hidden />
            </div>
            <h3 className="mt-6 font-serif text-2xl">{title}</h3>
            <p className="mt-2 leading-relaxed text-navy-500">{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const TRUST = [
  { icon: Layers, title: 'Multiple suppliers', text: 'Two independent suppliers queried for every search.' },
  { icon: RefreshCw, title: 'Aggregated on refresh', text: 'Refresh a city and a fresh aggregation runs across suppliers.' },
  { icon: Eye, title: 'Transparent comparison', text: 'Every offer, commission and price difference is visible.' },
  { icon: Zap, title: 'Fast repeat searches', text: 'Recent results are cached, so filters respond instantly.' },
];

export function Trust() {
  return (
    <section className="border-y border-navy-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-4 md:gap-0 md:divide-x md:divide-navy-100">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <div key={title} className="md:px-6 md:first:pl-0">
            <Icon className="h-5 w-5 text-brand-700" aria-hidden />
            <h3 className="mt-3 font-sans text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-navy-500">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-navy-900 text-ivory">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-20 sm:px-8 sm:py-24 md:flex-row md:items-end">
        <Reveal>
          <h2 className="max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">Your next stay deserves a better price.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <Link to="/search" className="group inline-flex items-center gap-2 rounded-md bg-terracotta px-7 py-4 font-medium text-white transition hover:bg-brand-700">
            Start searching
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
