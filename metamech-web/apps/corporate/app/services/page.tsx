import type { Metadata } from 'next';
import Capabilities from '@/components/sections/Capabilities';
import FinalCta from '@/components/sections/FinalCta';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Software & apps, AI & automation, engineering & 3D, and web & creative services from MetaMech Solutions.',
};

export default function ServicesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="mm-container">
          <p className="mm-eyebrow">Services</p>
          <h1>What MetaMech can build</h1>
          <p>Capabilities grounded in the products we build and the projects we deliver.</p>
        </div>
      </section>
      <Capabilities variant="full" />
      <FinalCta />
    </>
  );
}
