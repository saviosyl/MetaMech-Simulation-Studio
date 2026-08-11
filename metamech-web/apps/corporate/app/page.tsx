import ServiceHero from '@/components/hero/ServiceHero';
import ProductShowcase from '@/components/sections/ProductShowcase';
import Capabilities from '@/components/sections/Capabilities';
import SelectedWork from '@/components/sections/SelectedWork';
import HowWeWork from '@/components/sections/HowWeWork';
import AboutPositioning from '@/components/sections/AboutPositioning';
import FinalCta from '@/components/sections/FinalCta';

export default function HomePage() {
  return (
    <>
      <ServiceHero />
      <ProductShowcase />
      <Capabilities />
      <SelectedWork />
      <HowWeWork />
      <AboutPositioning />
      <FinalCta />
    </>
  );
}
