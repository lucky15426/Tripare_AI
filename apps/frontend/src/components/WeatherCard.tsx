import { CloudOff } from 'lucide-react';
import { useWeather } from '../hooks/queries';
import { titleCase } from '../utils/format';

/** Compact inline weather line: no card, degrades to a quiet "unavailable" note. */
export default function WeatherCard({ city }: { city: string }) {
  const { data, isLoading } = useWeather(city);
  if (isLoading) return <div className="skeleton h-5 w-44" />;

  if (data?.available) {
    return (
      <p className="flex items-center gap-2 text-sm text-navy-700">
        {data.icon && <img src={data.icon} alt={data.condition ?? 'weather'} className="h-8 w-8" />}
        <span><strong className="font-semibold">{data.temperatureC}°C</strong> in {titleCase(city)}, <span className="capitalize">{data.description}</span> · humidity {data.humidity}%</span>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-navy-500" title={data?.reason}>
      <CloudOff className="h-4 w-4" aria-hidden /> Weather unavailable
    </p>
  );
}
