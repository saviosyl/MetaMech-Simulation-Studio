import React from 'react';
import { Link } from 'react-router-dom';
import SimulationHomepageSection from '../components/marketing/simulation/SimulationHomepageSection';
import { simulationCtas } from '../content/simulationMarketingContent';

const HomePage: React.FC = () => {
  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        background:
          'radial-gradient(1100px 520px at -10% -10%, rgba(8,145,178,0.12), transparent 65%), radial-gradient(900px 520px at 110% 0%, rgba(37,99,235,0.1), transparent 62%), var(--mm-bg-app)',
      }}
    >
      <main style={{ width: 'min(1200px, calc(100% - 32px))', margin: '0 auto', padding: '22px 0 42px', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <img
              src="/simulation-studio-logo.png"
              alt="Simulation Studio"
              style={{ width: 'min(100%, 300px)', height: 58, objectFit: 'cover', objectPosition: 'center 45%', borderRadius: 10 }}
            />
            <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 50px)', lineHeight: 1.05, marginTop: 4 }}>
              Simulation Studio
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/simulation" style={ghostBtn}>Simulation Product</Link>
            <Link to="/simulation/access?mode=signin" style={ghostBtn}>Sign in</Link>
            <Link to="/simulation/access?mode=signup" style={primaryBtn}>{simulationCtas.startTrial}</Link>
          </div>
        </header>

        <SimulationHomepageSection />

        <section
          style={{
            borderRadius: 20,
            border: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-surface)',
            boxShadow: 'var(--mm-shadow-sm)',
            padding: '24px 28px',
          }}
        >
          <h2 style={{ fontSize: 28, marginBottom: 10 }}>Need a focused walkthrough?</h2>
          <p style={{ fontSize: 15, color: 'var(--mm-text-secondary)', marginBottom: 14 }}>
            Book a guided demo to review layout flow, simulation behavior, and presentation-ready output using your engineering context.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="https://metamechsolutions.com/contact/" style={primaryBtn}>Book Demo</a>
            <Link to="/simulation/pricing" style={ghostBtn}>View Pricing</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 44,
  padding: '0 16px',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
  color: '#fff',
  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
};

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 44,
  padding: '0 16px',
  borderRadius: 12,
  border: '1px solid var(--mm-border)',
  background: 'var(--mm-bg-panel)',
  color: 'var(--mm-text-primary)',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
};

export default HomePage;
