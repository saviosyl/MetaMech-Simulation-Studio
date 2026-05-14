import React from 'react';
import { Link } from 'react-router-dom';
import SimulationPricingModule from '../components/marketing/simulation/SimulationPricingModule';
import { simulationUrls } from '../content/simulationMarketingContent';

const SimulationPricingPage: React.FC = () => {
  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        background:
          'radial-gradient(1050px 540px at -12% -14%, rgba(8,145,178,0.16), transparent 65%), radial-gradient(960px 560px at 110% -6%, rgba(37,99,235,0.12), transparent 66%), var(--mm-bg-app)',
      }}
    >
      <main style={{ width: 'min(1160px, calc(100% - 34px))', margin: '0 auto', padding: '24px 0 52px', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: 10, flexWrap: 'wrap' }}>
          <a href={simulationUrls.productHome} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} title="Simulation home">
            <img
              src="/simulation-studio-logo.png"
              alt="Simulation Studio"
              style={{ width: 224, height: 46, objectFit: 'cover', objectPosition: 'center 45%', borderRadius: 10 }}
            />
          </a>
          <Link
            to="/simulation"
            style={{
              textDecoration: 'none',
              fontWeight: 700,
              color: 'var(--mm-text-primary)',
              border: '1px solid var(--mm-border)',
              borderRadius: 11,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 14px',
              background: 'var(--mm-bg-panel)',
              boxShadow: 'var(--mm-shadow-xs)',
            }}
          >
            Back to Simulation home
          </Link>
        </header>

        <section
          style={{
            borderRadius: 22,
            border: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-surface)',
            boxShadow: 'var(--mm-shadow-sm)',
            padding: 'clamp(20px, 3.2vw, 32px)',
            display: 'grid',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
              borderRadius: 999,
              padding: '6px 12px',
              border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 28%, var(--mm-border-subtle) 72%)',
              background: 'color-mix(in oklab, var(--mm-accent-primary) 10%, var(--mm-bg-surface) 90%)',
              color: 'var(--mm-accent-primary)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}
          >
            Simulation pricing
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 4.6vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 2, fontWeight: 800 }}>
            Clear plans for serious
            <br />
            engineering execution
          </h1>

          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--mm-text-secondary)', maxWidth: 820, fontWeight: 500 }}>
            Start with a 1-Day Trial, then continue with Full Access monthly or yearly. Entitlement automatically follows your active period, so access stays aligned with your selected plan.
          </p>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {[
              'Secure checkout via Stripe',
              'Trial starts after email verification',
              'Access validity follows your active plan period',
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 11,
                  border: '1px solid var(--mm-border-subtle)',
                  background: 'var(--mm-bg-panel)',
                  padding: '9px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--mm-text-secondary)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <SimulationPricingModule compact />
      </main>
    </div>
  );
};

export default SimulationPricingPage;
