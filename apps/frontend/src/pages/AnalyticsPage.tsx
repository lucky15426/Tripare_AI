import { CommissionChart, LowestPriceChart, PriceHistogramChart, SavingsChart, SupplierWinsChart } from '../charts/AnalyticsCharts';
import { Badge, Card, CardHeader, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { useCurrency } from '../hooks/CurrencyContext';
import { useAnalytics } from '../hooks/queries';

export default function AnalyticsPage() {
  const { format } = useCurrency();
  const { data, isLoading, isError, error, refetch } = useAnalytics();

  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Computed from the aggregated Redis datasets of every supported city (cold cities are filled by Temporal on first load)." />
      <div className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-2">
        <LowestPriceChart analytics={data} loading={isLoading} />
        <SupplierWinsChart analytics={data} loading={isLoading} />
        <SavingsChart analytics={data} loading={isLoading} />
        <PriceHistogramChart analytics={data} loading={isLoading} />
        <CommissionChart analytics={data} loading={isLoading} />

        <Card>
          <CardHeader title="City summary" subtitle="Lowest, average and highest cheapest-offer price" />
          <div className="overflow-x-auto px-2 pb-4">
            {isLoading ? (
              <Skeleton className="m-3 h-52" />
            ) : (
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-navy-500">
                  <tr>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Hotels</th>
                    <th className="px-3 py-2">Lowest</th>
                    <th className="px-3 py-2">Average</th>
                    <th className="px-3 py-2">Highest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {data?.cities.map((c) => (
                    <tr key={c.city}>
                      <td className="px-3 py-2.5 font-medium">
                        {c.label} {c.degraded && <Badge tone="warn">degraded</Badge>}
                      </td>
                      <td className="px-3 py-2.5">{c.hotels}</td>
                      <td className="px-3 py-2.5 text-saving-700">{c.lowestPrice !== null ? format(c.lowestPrice) : '-'}</td>
                      <td className="px-3 py-2.5">{c.averagePrice !== null ? format(c.averagePrice) : '-'}</td>
                      <td className="px-3 py-2.5">{c.highestPrice !== null ? format(c.highestPrice) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
