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
          <p>Real MetaMech products as proof — no invented client portfolios.</p>
        </div>
      </section>
      <SelectedWork />
      <FinalCta />
    </>
  );
}
