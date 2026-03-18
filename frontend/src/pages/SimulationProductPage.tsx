import React from 'react';
import { Link } from 'react-router-dom';
import SimulationPricingModule from '../components/marketing/simulation/SimulationPricingModule';
import {
  simulationBenefits,
  simulationCtas,
  simulationFaq,
  simulationHeroCopy,
  simulationHowItWorks,
  simulationMarketingAssets,
  simulationPersonas,
  simulationUseCases,
} from '../content/simulationMarketingContent';

const sectionCard: React.CSSProperties = {
  borderRadius: 20,
  border: '1px solid var(--mm-border-subtle)',
  background: 'var(--mm-bg-surface)',
  boxShadow: 'var(--mm-shadow-sm)',
  padding: 'clamp(20px, 3vw, 36px)',
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mm-text-tertiary)',
  marginBottom: 8,
};

const SimulationProductPage: React.FC = () => {
  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        background:
          'radial-gradient(1100px 520px at -10% -10%, rgba(8,145,178,0.12), transparent 65%), radial-gradient(900px 520px at 120% 0%, rgba(37,99,235,0.1), transparent 62%), var(--mm-bg-app)',
        color: 'var(--mm-text-primary)',
      }}
    >
      <main style={{ width: 'min(1200px, calc(100% - 32px))', margin: '0 auto', padding: '22px 0 42px', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--mm-text-primary)', fontWeight: 700, fontSize: 18 }}>
            MetaMech Studio
          </Link>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/login" style={{ ...navBtn, background: 'var(--mm-bg-panel)' }}>Log In</Link>
            <Link to="/register" style={{ ...navBtn, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#fff', border: 'none' }}>
              {simulationCtas.startTrial}
            </Link>
          </div>
        </header>

        <section style={sectionCard}>
          <div style={eyebrow}>Simulation product</div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.05, marginBottom: 12, maxWidth: 760 }}>
            {simulationHeroCopy.headline}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--mm-text-secondary)', maxWidth: 780, marginBottom: 18 }}>
            {simulationHeroCopy.subheadline}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <Link to="/register" style={primaryBtn}>{simulationCtas.startTrial}</Link>
            <Link to="/simulation#final-cta" style={ghostBtn}>{simulationCtas.bookDemo}</Link>
          </div>
          <img
            src={simulationMarketingAssets.hero}
            alt="Simulation hero scene"
            style={{ width: '100%', borderRadius: 16, border: '1px solid var(--mm-border-subtle)', boxShadow: 'var(--mm-shadow-sm)' }}
          />
        </section>

        <section style={sectionCard}>
          <p style={{ fontSize: 18, lineHeight: 1.55, marginBottom: 8 }}>
            When flow behavior is visible early, decisions improve and project risk drops.
          </p>
          <p style={{ fontSize: 16, color: 'var(--mm-text-secondary)', lineHeight: 1.6 }}>
            MetaMech Studio gives engineering teams a clear way to test line behavior, align stakeholders, and move forward with confidence.
          </p>
        </section>

        <section style={sectionCard}>
          <div style={eyebrow}>Why teams choose MetaMech Studio</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
            {simulationBenefits.map((benefit) => (
              <article key={benefit.title} style={{ borderRadius: 14, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-panel)', padding: '14px 14px 12px' }}>
                <h3 style={{ fontSize: 17, marginBottom: 6 }}>{benefit.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--mm-text-secondary)', lineHeight: 1.55 }}>{benefit.body}</p>
              </article>
            ))}
          </div>
          <img
            src={simulationMarketingAssets.connectionProof}
            alt="Connection and transfer proof"
            style={{ width: '100%', borderRadius: 14, border: '1px solid var(--mm-border-subtle)' }}
          />
        </section>

        <section style={sectionCard}>
          <div style={eyebrow}>How MetaMech Studio works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
            {simulationHowItWorks.map((step, index) => (
              <div key={step.title} style={{ borderRadius: 12, background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border-subtle)', padding: '12px 12px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mm-text-tertiary)', marginBottom: 5 }}>STEP {index + 1}</div>
                <h3 style={{ fontSize: 16, marginBottom: 5 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--mm-text-secondary)', lineHeight: 1.5 }}>{step.body}</p>
              </div>
            ))}
          </div>
          <img
            src={simulationMarketingAssets.flowProof}
            alt="Flow behavior proof"
            style={{ width: '100%', borderRadius: 14, border: '1px solid var(--mm-border-subtle)' }}
          />
        </section>

        <section style={sectionCard}>
          <div style={eyebrow}>Use cases and fit</div>
          <h2 style={{ fontSize: 30, lineHeight: 1.15, marginBottom: 12 }}>Built for engineering teams that need clear, fast simulation proof</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div style={{ borderRadius: 14, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-panel)', padding: '14px 16px' }}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>Best fit for</h3>
              <ul style={{ marginLeft: 18, color: 'var(--mm-text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
                {simulationPersonas.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-panel)', padding: '14px 16px' }}>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>Common use cases</h3>
              <ul style={{ marginLeft: 18, color: 'var(--mm-text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
                {simulationUseCases.map((u) => <li key={u}>{u}</li>)}
              </ul>
            </div>
          </div>
          <img
            src={simulationMarketingAssets.reliabilityProof}
            alt="Reliability proof"
            style={{ width: '100%', borderRadius: 14, border: '1px solid var(--mm-border-subtle)' }}
          />
        </section>

        <SimulationPricingModule />

        <section style={sectionCard}>
          <div style={eyebrow}>Frequently asked questions</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {simulationFaq.map((item) => (
              <details
                key={item.q}
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--mm-border-subtle)',
                  background: 'var(--mm-bg-panel)',
                  padding: '10px 12px',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{item.q}</summary>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--mm-text-secondary)', lineHeight: 1.6 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="final-cta" style={{ ...sectionCard, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', lineHeight: 1.1, marginBottom: 10 }}>
            Ready to move from concept to confident execution?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--mm-text-secondary)', marginBottom: 16 }}>
            Start with a 1-Day Trial or book a focused demo tailored to your line.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link to="/register" style={primaryBtn}>{simulationCtas.startTrial}</Link>
            <Link to="/simulation" style={ghostBtn}>{simulationCtas.bookDemo}</Link>
            <Link to="/login" style={ghostBtn}>{simulationCtas.contactSales}</Link>
          </div>
          <img
            src={simulationMarketingAssets.presentationProof}
            alt="Presentation quality scene"
            style={{ width: '100%', borderRadius: 14, border: '1px solid var(--mm-border-subtle)' }}
          />
        </section>
      </main>
    </div>
  );
};

const navBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 40,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid var(--mm-border)',
  color: 'var(--mm-text-primary)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 46,
  padding: '0 18px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
  color: '#fff',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
};

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 46,
  padding: '0 18px',
  borderRadius: 12,
  border: '1px solid var(--mm-border)',
  color: 'var(--mm-text-primary)',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
  background: 'var(--mm-bg-panel)',
};

export default SimulationProductPage;
