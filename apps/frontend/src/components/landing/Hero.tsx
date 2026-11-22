import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCities } from '../../hooks/queries';
import { HERO_IMAGE } from '../../utils/images';

export default function Hero() {
  const navigate = useNavigate();
  const cities = useCities();
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({ city: (city.trim() || 'delhi').toLowerCase() });
    if (maxPrice) params.set('maxPrice', maxPrice);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative isolate flex min-h-[92vh] items-end overflow-hidden bg-navy-900 pb-10 pt-32 sm:pb-16">
      <img src={HERO_IMAGE} alt="Infinity pool at a resort at sunset" className="absolute inset-0 -z-10 h-full w-full object-cover" fetchPriority="high" />
      {/* One flat overlay for text contrast; heavier at the bottom where the search panel sits */}
      <div className="absolute inset-0 -z-10 bg-navy-950/45" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-navy-950/60 to-transparent" />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <p className="eyebrow !text-ivory/80">Hotel price comparison</p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-[1.04] text-white sm:text-7xl lg:text-[5.5rem]">
            Find the stay.
            <br />
            <span className="italic text-ivory/90">Not just the price.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ivory/85">Compare hotel offers across suppliers and find the best price for your next trip.</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="mt-10 grid max-w-4xl gap-px overflow-hidden rounded-lg bg-navy-200/60 shadow-2xl shadow-navy-950/30 sm:grid-cols-[1.6fr_1fr_auto]"
          aria-label="Search hotels"
        >
          <label className="flex items-center gap-3 bg-white px-5 py-4">
            <MapPin className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            <span className="flex-1">
              <span className="label !mb-0.5">Destination</span>
              <input
                className="w-full bg-transparent text-base font-medium text-navy-900 outline-none placeholder:font-normal placeholder:text-navy-400"
                placeholder="Delhi, Goa, Jaipur…"
                list="hero-cities"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="off"
              />
              <datalist id="hero-cities">{cities.data?.data.map((c) => <option key={c.slug} value={c.label} />)}</datalist>
            </span>
          </label>
          <label className="flex items-center gap-3 bg-white px-5 py-4">
            <Wallet className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            <span className="flex-1">
              <span className="label !mb-0.5">Budget per night</span>
              <select className="w-full bg-transparent text-base font-medium text-navy-900 outline-none" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
                <option value="">Any price</option>
                <option value="3000">Up to ₹3,000</option>
                <option value="5000">Up to ₹5,000</option>
                <option value="8000">Up to ₹8,000</option>
                <option value="12000">Up to ₹12,000</option>
              </select>
            </span>
          </label>
          <button type="submit" className="group flex items-center justify-center gap-2 bg-navy-900 px-8 py-4 font-medium text-white transition hover:bg-navy-800">
            Search hotels
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </motion.form>
      </div>
    </section>
  );
}
