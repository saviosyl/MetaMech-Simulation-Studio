import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MetaMech Simulation Studio',
  description:
    'Browser-based interactive 3D engineering environment for industrial equipment, layouts and demonstrations.',
};

const simulationUrl = process.env.NEXT_PUBLIC_SIMULATION_URL || '';
const appUrl = process.env.NEXT_PUBLIC_SIMULATION_APP_URL || 'https://metamech-studio.pages.dev';

export default function SimulationProductPage() {
  return (
    <section className="page-hero">
      <div className="mm-container" style={{ paddingBottom: '4rem' }}>
        <p className="mm-eyebrow">Interactive 3D Engineering</p>
        <h1>MetaMech Simulation Studio</h1>
        <p>
          Design, configure and visualise industrial systems in an interactive browser-based environment —
          conveyors, warehouse layouts, equipment placement, behaviours and customer demonstrations.
        </p>
        <div
          style={{
            marginTop: '1.5rem',
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid var(--mm-border)',
            boxShadow: 'var(--mm-shadow-soft)',
          }}
        >
          <Image
            src="/sim-hero-main-light-v01.png"
            alt="MetaMech Simulation Studio interface"
            width={1400}
            height={800}
            priority
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
          {simulationUrl ? (
            <a
              href={simulationUrl}
              className="mm-btn mm-btn-primary"
              style={{
                background: 'linear-gradient(135deg, #20C7C9, #43D7FF)',
                color: '#fff',
                border: 'none',
                padding: '0.85rem 1.35rem',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Explore Simulation Studio
            </a>
          ) : null}
          <a href={appUrl} className="mm-btn mm-btn-secondary" rel="noopener noreferrer">
            Open application
          </a>
          <Link href="/contact/" className="mm-btn mm-btn-secondary">
            Start a Project
          </Link>
        </div>
      </div>
    </section>
  );
}
