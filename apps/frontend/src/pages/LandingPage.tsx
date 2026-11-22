import Destinations from '../components/landing/Destinations';
import FeaturedHotels from '../components/landing/FeaturedHotels';
import Hero from '../components/landing/Hero';
import { FinalCta, HowItWorks, Trust } from '../components/landing/Sections';

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Destinations />
      <FeaturedHotels />
      <HowItWorks />
      <Trust />
      <FinalCta />
    </main>
  );
}
