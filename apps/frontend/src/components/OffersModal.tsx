import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useCurrency } from '../hooks/CurrencyContext';
import { useOffers } from '../hooks/queries';
import type { Hotel } from '../types';
import { titleCase } from '../utils/format';
import { hotelImage } from '../utils/images';
import { Button, ErrorState, Skeleton, SupplierBadge } from './ui';

export default function OffersModal({ hotel, onClose }: { hotel: Hotel; onClose: () => void }) {
  const { format } = useCurrency();
  const { data, isLoading, error, refetch } = useOffers(hotel.city, hotel.slug);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Offers for ${hotel.name}`}>
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-ivory shadow-2xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-36 bg-navy-800 sm:h-44">
          <img src={hotelImage(hotel.name, 1000, 360)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-navy-950/50" />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-md bg-ivory p-1.5 text-navy-900 hover:bg-white"><X className="h-5 w-5" /></button>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="eyebrow !text-ivory/80">Compare offers</p>
            <h2 className="font-serif text-3xl">{hotel.name}</h2>
            <p className="text-sm text-white/80">{titleCase(hotel.city)}</p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {isLoading && <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-32 w-full" /></div>}
          {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}

          {data && (
            <>
              <dl className="grid grid-cols-3 divide-x divide-navy-100 border-y border-navy-100 py-4 text-center">
                <div><dt className="label !mb-1">Cheapest</dt><dd className="font-serif text-2xl sm:text-3xl">{format(data.bestOffer?.price ?? 0)}</dd><dd className="text-xs text-navy-500">{data.bestOffer?.supplier}</dd></div>
                <div><dt className="label !mb-1">You save</dt><dd className="font-serif text-2xl text-saving-700 sm:text-3xl">{data.savings > 0 ? format(data.savings) : '–'}</dd><dd className="text-xs text-navy-500">{data.offers.length > 1 ? 'vs. next offer' : 'single supplier'}</dd></div>
                <div><dt className="label !mb-1">Suppliers</dt><dd className="font-serif text-2xl sm:text-3xl">{data.offers.length}</dd><dd className="text-xs text-navy-500">compared</dd></div>
              </dl>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.12em] text-navy-500">
                    <tr className="border-b border-navy-900">
                      <th className="py-2.5 pr-3 font-medium">Supplier</th>
                      <th className="py-2.5 pr-3 font-medium">Price / night</th>
                      <th className="py-2.5 pr-3 font-medium">Difference</th>
                      <th className="py-2.5 pr-3 font-medium">Commission</th>
                      <th className="py-2.5 font-medium">Listing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.offers.map((offer) => (
                      <tr key={offer.supplier} className="border-b border-navy-100">
                        <td className="py-3.5 pr-3"><div className="flex items-center gap-2"><SupplierBadge supplier={offer.supplier} />{offer.isBest && <span className="text-xs font-medium text-saving-700">Best price</span>}</div></td>
                        <td className={`py-3.5 pr-3 text-base ${offer.isBest ? 'font-semibold text-navy-900' : 'text-navy-700'}`}><span className={offer.isBest ? 'border-b-2 border-terracotta pb-0.5' : ''}>{format(offer.price)}</span></td>
                        <td className="py-3.5 pr-3">{offer.priceDifference === 0 ? <span className="text-navy-400">–</span> : <span className="text-navy-700">+{format(offer.priceDifference)}</span>}</td>
                        <td className="py-3.5 pr-3">{offer.commissionPct}%</td>
                        <td className="py-3.5 font-mono text-xs text-navy-500">{offer.hotelId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {data.offers.map((offer) => (
                  <div key={offer.supplier}>
                    <p className="label">{offer.supplier} says</p>
                    <p className="text-sm leading-relaxed text-navy-700">{offer.description ?? 'No description provided by this supplier.'}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-navy-500">Supplier rates are in INR; other currencies are for reference. On equal prices the higher-commission offer is listed first.</p>
              <Button variant="secondary" className="mt-5" onClick={onClose}>Close</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
