import React from 'react';
import { Link } from 'react-router-dom';
import SimulationPricingModule from '../components/marketing/simulation/SimulationPricingModule';
import { simulationUrls } from '../content/simulationMarketingContent';

const SimulationPricingPage: React.FC = () => {
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--mm-bg-app)' }}>
      <main style={{ width: 'min(1100px, calc(100% - 32px))', margin: '0 auto', padding: '22px 0 42px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <a href={simulationUrls.productHome} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} title="Simulation home">
            <img
              src="/simulation-studio-logo.png"
              alt="Simulation Studio"
              style={{ width: 210, height: 44, objectFit: 'cover', objectPosition: 'center 45%', borderRadius: 10 }}
            />
          </a>
          <Link
            to="/simulation"
            style={{
              textDecoration: 'none',
              fontWeight: 700,
              color: 'var(--mm-text-primary)',
              border: '1px solid var(--mm-border)',
              borderRadius: 10,
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 12px',
              background: 'var(--mm-bg-panel)',
            }}
          >
            Back to Simulation home
          </Link>
        </header>
        <section style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 'clamp(30px, 4vw, 44px)', lineHeight: 1.08, letterSpacing: '-0.018em', marginBottom: 8, fontWeight: 780 }}>
            Simulation pricing and access
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--mm-text-secondary)', maxWidth: 760 }}>
            Start with a 1-Day Trial, then continue with Full Access monthly or yearly based on how your team runs engineering reviews.
          </p>
        </section>
        <SimulationPricingModule compact />
      </main>
    </div>
  );
};

export default SimulationPricingPage;
