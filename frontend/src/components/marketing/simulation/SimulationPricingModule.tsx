import React from 'react';
import { Link } from 'react-router-dom';
import { simulationCtas, simulationMarketingAssets, simulationStripeLinks } from '../../../content/simulationMarketingContent';

interface SimulationPricingModuleProps {
  compact?: boolean;
}

const SimulationPricingModule: React.FC<SimulationPricingModuleProps> = ({ compact = false }) => {
  return (
    <section
      style={{
        borderRadius: 20,
        border: '1px solid var(--mm-border-subtle)',
        background: 'var(--mm-bg-surface)',
        boxShadow: 'var(--mm-shadow-sm)',
        padding: compact ? '24px' : '34px',
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--mm-text-tertiary)',
            marginBottom: 8,
          }}
        >
          Simulation Tool Pricing
        </div>
        <h2 style={{ fontSize: compact ? 28 : 34, lineHeight: 1.12, fontWeight: 760, marginBottom: 10, letterSpacing: '-0.014em' }}>
          Simple access pricing for engineering teams
        </h2>
        <p style={{ fontSize: 15, color: 'var(--mm-text-secondary)', maxWidth: 760 }}>
          Start with a 1-Day Trial, then continue with Full Access monthly or yearly for ongoing project work.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <article
          style={{
            borderRadius: 16,
            border: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-panel)',
            padding: '20px 20px 18px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              padding: '6px 10px',
              background: 'var(--mm-accent-primary-muted)',
              color: 'var(--mm-accent-primary)',
              marginBottom: 10,
            }}
          >
            1-Day Trial
          </div>
          <h3 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>1-Day Trial</h3>
          <p style={{ fontSize: 14, color: 'var(--mm-text-secondary)', minHeight: 42 }}>
            Full access for a focused, real-world evaluation in one day.
          </p>
          <ul style={{ margin: '12px 0 16px 18px', color: 'var(--mm-text-secondary)', fontSize: 14, lineHeight: 1.65 }}>
            <li>Full Simulation Tool access</li>
            <li>Use your own realistic layout context</li>
            <li>Fast fit-check for your team</li>
          </ul>
          <Link
            to="/simulation/access?mode=signup"
            style={{
              width: '100%',
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {simulationCtas.startTrial}
          </Link>
        </article>

        <article
          style={{
            borderRadius: 16,
            border: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-panel)',
            padding: '20px 20px 18px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              padding: '6px 10px',
              background: 'var(--mm-accent-primary-muted)',
              color: 'var(--mm-accent-primary)',
              marginBottom: 10,
            }}
          >
            Full Access
          </div>
          <h3 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Full Access</h3>
          <p style={{ fontSize: 14, color: 'var(--mm-text-secondary)', minHeight: 42 }}>
            Continuous access for active engineering, planning, and presentation work.
          </p>
          <ul style={{ margin: '12px 0 16px 18px', color: 'var(--mm-text-secondary)', fontSize: 14, lineHeight: 1.65 }}>
            <li>Monthly billing option</li>
            <li>Yearly billing option</li>
            <li>Recommended yearly for ongoing usage</li>
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            <a
              href={simulationStripeLinks.monthly.url}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {simulationStripeLinks.monthly.label}
            </a>
            <a
              href={simulationStripeLinks.yearly.url}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--mm-border)',
                background: 'var(--mm-bg-panel)',
                color: 'var(--mm-text-primary)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {simulationStripeLinks.yearly.label}
            </a>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--mm-text-tertiary)', lineHeight: 1.5 }}>
            Secure checkout via Stripe.
          </p>
        </article>
      </div>

      <p style={{ fontSize: 13, color: 'var(--mm-text-tertiary)', marginBottom: 8 }}>
        Yearly is recommended for teams running this work continuously.
      </p>
      <p style={{ fontSize: 14, color: 'var(--mm-text-primary)', fontWeight: 600 }}>
        Finish your trial and move to Full Access to keep momentum without interruption.
      </p>

      <div style={{ marginTop: 16 }}>
        <img
          src={simulationMarketingAssets.pricingSupport}
          alt="Simulation pricing support visual"
          style={{
            width: '100%',
            borderRadius: 14,
            border: '1px solid var(--mm-border-subtle)',
            boxShadow: 'var(--mm-shadow-sm)',
          }}
        />
      </div>
    </section>
  );
};

export default SimulationPricingModule;
