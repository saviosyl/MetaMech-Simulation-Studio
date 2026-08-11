import type { Metadata } from 'next';
import SelectedWork from '@/components/sections/SelectedWork';
import FinalCta from '@/components/sections/FinalCta';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Selected MetaMech work featuring MDAT, Simulation Studio and GoldMeta.',
};

export default function WorkPage() {
  return (
    <>
      <section className="page-hero">
        <div className="mm-container">
          <p className="mm-eyebrow">Work</p>
          <h1>Selected work</h1>
          <p>Selected MetaMech products that demonstrate what we design and ship.</p>
        </div>
      </section>
      <SelectedWork />
      <FinalCta />
    </>
  );
}
