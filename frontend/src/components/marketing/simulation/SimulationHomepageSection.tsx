import React from 'react';
import { Link } from 'react-router-dom';
import { simulationCtas, simulationMarketingAssets } from '../../../content/simulationMarketingContent';

const SimulationHomepageSection: React.FC = () => {
  return (
    <section
      style={{
        borderRadius: 20,
        border: '1px solid var(--mm-border-subtle)',
        background: 'var(--mm-bg-surface)',
        boxShadow: 'var(--mm-shadow-sm)',
        padding: 'clamp(20px, 4vw, 36px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 20,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
        <div>
          <img
            src="/simulation-studio-logo.png"
            alt="Simulation Studio"
            style={{ width: 'min(100%, 280px)', height: 52, objectFit: 'cover', objectPosition: 'center 45%', borderRadius: 10, marginBottom: 8 }}
          />
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.1, marginBottom: 10, fontWeight: 700 }}>
            Industrial layout insight for faster, smarter decisions.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--mm-text-secondary)', maxWidth: 760, marginBottom: 14 }}>
            MetaMech Studio helps teams shape layouts, test line behavior, and present clear outcomes before implementation.
          </p>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
            {[
              'Reveal transfer and flow behavior earlier',
              'Reduce rework risk with clearer technical evidence',
              'Align engineering and business stakeholders faster',
              'Present polished scenarios with confidence',
            ].map((item) => (
              <li
                key={item}
                style={{
                  fontSize: 14,
                  color: 'var(--mm-text-secondary)',
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--mm-border-subtle)',
                  background: 'var(--mm-bg-panel)',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/simulation"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 44,
              padding: '0 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {simulationCtas.startTrial}
          </Link>
          <Link
            to="/simulation"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 44,
              padding: '0 18px',
              borderRadius: 12,
              border: '1px solid var(--mm-border)',
              color: 'var(--mm-text-primary)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
              background: 'var(--mm-bg-panel)',
            }}
          >
            {simulationCtas.bookDemo}
          </Link>
        </div>

        <img
          src={simulationMarketingAssets.hero}
          alt="MetaMech Studio simulation scene"
          style={{
            width: '100%',
            borderRadius: 16,
            border: '1px solid var(--mm-border-subtle)',
            boxShadow: 'var(--mm-shadow-sm)',
          }}
        />
      </div>
    </section>
  );
};

export default SimulationHomepageSection;
