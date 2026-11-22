import { Link, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import MarketingLayout from './layouts/MarketingLayout';
import AnalyticsPage from './pages/AnalyticsPage';
import LandingPage from './pages/LandingPage';
import OverviewPage from './pages/OverviewPage';
import SearchPage from './pages/SearchPage';
import SuppliersPage from './pages/SuppliersPage';
import WorkflowsPage from './pages/WorkflowsPage';

function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-40 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-5xl">Page not found</h1>
      <p className="mt-3 text-navy-500">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-navy-900 px-5 py-2.5 text-sm font-medium text-white">Back to StaySync</Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="dashboard" element={<OverviewPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  );
}
