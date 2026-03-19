import React from 'react';
import { Link } from 'react-router-dom';
import SimulationPricingModule from '../components/marketing/simulation/SimulationPricingModule';

const SimulationPricingPage: React.FC = () => {
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--mm-bg-app)' }}>
      <main style={{ width: 'min(1100px, calc(100% - 32px))', margin: '0 auto', padding: '22px 0 42px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            <img
              src="/simulation-studio-logo.png"
              alt="Simulation Studio"
              style={{ width: 210, height: 44, objectFit: 'cover', objectPosition: 'center 45%', borderRadius: 10 }}
            />
          </Link>
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
            View Simulation Page
          </Link>
        </header>
        <SimulationPricingModule compact />
      </main>
    </div>
  );
};

export default SimulationPricingPage;
