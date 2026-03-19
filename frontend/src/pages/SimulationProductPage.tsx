import React from 'react';
import { Link } from 'react-router-dom';
import {
  simulationCtas,
  simulationFaq,
} from '../content/simulationMarketingContent';

const visuals = {
  hero: '/assets/simulation-intro/sim-intro-hero-concept-20260319.png',
  workspace: '/assets/simulation-intro/sim-intro-workspace-20260319.png',
  engineer: '/assets/simulation-intro/sim-intro-engineer-20260319.png',
} as const;

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--mm-text-tertiary)',
  marginBottom: 10,
};

const SimulationProductPage: React.FC = () => {
  const benefits = [
    {
      title: 'Faster concept validation',
      body: 'Test layout and transfer behavior early so key decisions happen before physical implementation.',
    },
    {
      title: 'Clear stakeholder communication',
      body: 'Share visual simulation evidence that engineering, operations, and leadership can align on quickly.',
    },
    {
      title: 'Reduced rework risk',
      body: 'Identify flow, connection, and handoff issues while changes are still low-cost and fast.',
    },
    {
      title: 'Presentation-ready output',
      body: 'Use polished scenes and exports to support internal reviews and customer-facing discussions.',
    },
  ];

  const steps = [
    { title: 'Build layout', body: 'Compose the line with practical industrial modules.' },
    { title: 'Connect modules', body: 'Define transfer paths and node-to-node flow.' },
    { title: 'Simulate flow', body: 'Run movement scenarios and validate behavior.' },
    { title: 'Review and present', body: 'Communicate outcomes with clear visuals and exports.' },
  ];

  const useCases = [
    'Conveyor layout concept studies',
    'Production line transfer validation',
    'Internal engineering decision reviews',
    'Customer demo and proposal support',
  ];

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background:
          'radial-gradient(1200px 620px at -8% -10%, rgba(8,145,178,0.16), transparent 64%), radial-gradient(1000px 640px at 108% -2%, rgba(37,99,235,0.12), transparent 66%), linear-gradient(180deg, color-mix(in oklab, var(--mm-bg-app) 86%, #f1f5f9 14%) 0%, var(--mm-bg-app) 48%, var(--mm-bg-app) 100%)',
        color: 'var(--mm-text-primary)',
      }}
    >
      <main style={{ width: 'min(1240px, calc(100% - 40px))', margin: '0 auto', padding: '26px 0 56px', display: 'grid', gap: 24 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <img
              src="/simulation-studio-logo.png"
              alt="Simulation Studio"
              style={{ width: 248, height: 52, objectFit: 'cover', objectPosition: 'center 45%', borderRadius: 10 }}
            />
          </Link>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/simulation/access?mode=signin" style={{ ...navBtn, background: 'var(--mm-bg-panel)' }}>Sign in</Link>
            <Link to="/simulation/access?mode=signup" style={{ ...navBtn, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#fff', border: 'none' }}>
              {simulationCtas.startTrial}
            </Link>
          </div>
        </header>

        <section style={{ ...sectionCard, padding: 'clamp(22px, 3.4vw, 40px)' }}>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' }}>
            <div style={{ display: 'grid', alignContent: 'start' }}>
              <div style={eyebrow}>Simulation intro</div>
              <h1 style={{ fontSize: 'clamp(40px, 5.6vw, 66px)', lineHeight: 1.01, letterSpacing: '-0.022em', marginBottom: 14, maxWidth: 620, fontWeight: 800 }}>
                Industrial simulation for decisions you can defend.
              </h1>
              <p style={{ fontSize: 17, color: 'var(--mm-text-secondary)', lineHeight: 1.68, maxWidth: 620, marginBottom: 20, fontWeight: 500 }}>
                MetaMech Simulation Studio helps engineering teams design layouts, validate flow behavior, and present clear implementation decisions with confidence.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <Link to="/simulation/access?mode=signup" style={primaryBtn}>{simulationCtas.startTrial}</Link>
                <Link to="/simulation/access?mode=signin" style={ghostBtn}>Sign in</Link>
                <Link to="/simulation/pricing" style={ghostBtn}>View pricing</Link>
                <a href="https://metamechsolutions.com/contact/" style={ghostBtn}>{simulationCtas.bookDemo}</a>
              </div>
              <div style={{ fontSize: 13, color: 'var(--mm-text-tertiary)', fontWeight: 600, lineHeight: 1.5 }}>
                Product-led intro first. Access when you are ready.
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-14px -14px auto auto',
                  width: '64%',
                  height: 90,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(8,145,178,0.24), rgba(37,99,235,0.12))',
                  filter: 'blur(24px)',
                  pointerEvents: 'none',
                }}
              />
              <img
                src={visuals.hero}
                alt="Simulation Studio in use during engineering review"
                style={{
                  width: '100%',
                  borderRadius: 18,
                  border: '1px solid var(--mm-border-subtle)',
                  boxShadow: 'var(--mm-shadow-md)',
                  objectFit: 'cover',
                  minHeight: 330,
                }}
              />
            </div>
          </div>
        </section>

        <section style={sectionCard}>
          <div style={eyebrow}>Why engineering teams use it</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {benefits.map((benefit) => (
              <article key={benefit.title} style={{ borderRadius: 14, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-panel)', padding: '14px 14px 12px' }}>
                <h3 style={{ fontSize: 18, marginBottom: 7, letterSpacing: '-0.01em', fontWeight: 750 }}>{benefit.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--mm-text-secondary)', lineHeight: 1.62, fontWeight: 500 }}>{benefit.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ ...sectionCard, display: 'grid', gap: 14 }}>
          <div style={eyebrow}>Real product view</div>
          <img
            src={visuals.workspace}
            alt="Simulation workspace showing live industrial layout setup"
            style={{ width: '100%', borderRadius: 16, border: '1px solid var(--mm-border-subtle)', boxShadow: 'var(--mm-shadow-sm)' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div style={featureStrip}>Workspace designed for practical layout construction</div>
            <div style={featureStrip}>Flow control and transfer checks in one environment</div>
            <div style={featureStrip}>Presentation-ready visuals for stakeholder reviews</div>
          </div>
        </section>

        <section id="how-it-works" style={sectionCard}>
          <div style={eyebrow}>How it works</div>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <div style={{ display: 'grid', gap: 10 }}>
              {steps.map((step, index) => (
                <div key={step.title} style={{ borderRadius: 12, background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border-subtle)', padding: '12px 13px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mm-text-tertiary)', marginBottom: 4, letterSpacing: '0.08em' }}>STEP {index + 1}</div>
                  <h3 style={{ fontSize: 16, marginBottom: 4, fontWeight: 750 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--mm-text-secondary)', lineHeight: 1.58, fontWeight: 500 }}>{step.body}</p>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--mm-border-subtle)', boxShadow: 'var(--mm-shadow-sm)' }}>
              <img
                src={visuals.engineer}
                alt="Engineer reviewing MetaMech Simulation Studio in production context"
                style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 320 }}
              />
            </div>
          </div>
        </section>

        <section style={sectionCard}>
          <div style={eyebrow}>Use cases</div>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 46px)', lineHeight: 1.08, marginBottom: 12, letterSpacing: '-0.018em', fontWeight: 800 }}>
            Built for real engineering review cycles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {useCases.map((useCase) => (
              <div key={useCase} style={{ borderRadius: 12, background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border-subtle)', padding: '12px 12px 10px' }}>
                <h3 style={{ fontSize: 15, margin: 0, fontWeight: 700, lineHeight: 1.45 }}>{useCase}</h3>
              </div>
            ))}
          </div>
        </section>

        <section style={sectionCard}>
          <div style={eyebrow}>Trial and access</div>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', lineHeight: 1.08, marginBottom: 12, letterSpacing: '-0.018em', fontWeight: 800 }}>
            Start quickly, then continue with Full Access
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <article style={{ borderRadius: 14, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-panel)', padding: '16px 16px 14px' }}>
              <div style={pill}>1-Day Trial</div>
              <h3 style={{ fontSize: 22, marginBottom: 8, fontWeight: 780, letterSpacing: '-0.01em' }}>Evaluate in one focused day</h3>
              <p style={{ color: 'var(--mm-text-secondary)', fontSize: 14, lineHeight: 1.62, marginBottom: 12, fontWeight: 500 }}>
                Full Simulation access to validate your workflow using realistic line scenarios.
              </p>
              <Link to="/simulation/access?mode=signup" style={{ ...primaryBtn, width: '100%' }}>
                {simulationCtas.startTrial}
              </Link>
            </article>
            <article style={{ borderRadius: 14, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-panel)', padding: '16px 16px 14px' }}>
              <div style={pill}>Full Access</div>
              <h3 style={{ fontSize: 22, marginBottom: 8, fontWeight: 780, letterSpacing: '-0.01em' }}>Monthly or yearly</h3>
              <p style={{ color: 'var(--mm-text-secondary)', fontSize: 14, lineHeight: 1.62, marginBottom: 12, fontWeight: 500 }}>
                Continue with ongoing Simulation use for engineering, review, and presentation work.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                <Link to="/simulation/pricing" style={{ ...ghostBtn, width: '100%' }}>
                  View Pricing
                </Link>
                <Link to="/simulation/access?mode=signin" style={{ ...ghostBtn, width: '100%' }}>
                  Sign in
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section style={{ ...sectionCard, paddingTop: 22 }}>
          <div style={eyebrow}>Frequently asked questions</div>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {simulationFaq.slice(0, 6).map((item) => (
              <details
                key={item.q}
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--mm-border-subtle)',
                  background: 'var(--mm-bg-panel)',
                  padding: '10px 12px',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 750, fontSize: 15, lineHeight: 1.4 }}>{item.q}</summary>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--mm-text-secondary)', lineHeight: 1.66, fontWeight: 500 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="final-cta" style={{ ...sectionCard, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(36px, 5.2vw, 56px)', lineHeight: 1.03, marginBottom: 10, letterSpacing: '-0.022em', fontWeight: 800 }}>
            Ready to validate your layout with confidence?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--mm-text-secondary)', marginBottom: 16, lineHeight: 1.64, fontWeight: 500 }}>
            Start your 1-Day Trial, sign in to continue, or review pricing for Full Access.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link to="/simulation/access?mode=signup" style={primaryBtn}>{simulationCtas.startTrial}</Link>
            <Link to="/simulation/access?mode=signin" style={ghostBtn}>Sign in</Link>
            <Link to="/simulation/pricing" style={ghostBtn}>View pricing</Link>
            <a href="https://metamechsolutions.com/contact/" style={ghostBtn}>{simulationCtas.bookDemo}</a>
          </div>
        </section>
      </main>
    </div>
  );
};

const sectionCard: React.CSSProperties = {
  borderRadius: 22,
  border: '1px solid var(--mm-border-subtle)',
  background: 'var(--mm-bg-surface)',
  boxShadow: 'var(--mm-shadow-sm)',
  padding: 'clamp(20px, 3vw, 34px)',
};

const featureStrip: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid var(--mm-border-subtle)',
  background: 'var(--mm-bg-panel)',
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--mm-text-secondary)',
  fontWeight: 600,
};

const pill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  background: 'var(--mm-accent-primary-muted)',
  color: 'var(--mm-accent-primary)',
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 9,
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
  height: 44,
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
  height: 44,
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
