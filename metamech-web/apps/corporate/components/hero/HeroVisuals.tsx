import Image from 'next/image';
import type { HeroService } from './services';

function SoftwareComposition() {
  return (
    <div className="hero-comp hero-comp--software" aria-hidden="true">
      <div className="soft-stage">
        <div className="soft-laptop">
          <div className="soft-laptop__bezel">
            <div className="soft-app">
              <aside className="soft-app__nav">
                <strong>MetaMech</strong>
                <span>Projects</span>
                <span>Workflows</span>
                <span>Integrations</span>
                <span>Activity</span>
              </aside>
              <div className="soft-app__main">
                <header>
                  <b>Operations Console</b>
                  <em>System Status · Stable</em>
                </header>
                <div className="soft-app__grid">
                  <article>
                    <small>Projects</small>
                    <strong>Workspace</strong>
                    <div className="soft-bars">
                      <i style={{ width: '72%' }} />
                      <i style={{ width: '54%' }} />
                      <i style={{ width: '86%' }} />
                    </div>
                  </article>
                  <article>
                    <small>Automation</small>
                    <strong>Pipelines</strong>
                    <div className="soft-chips">
                      <span>Build</span>
                      <span>Review</span>
                      <span>Deploy</span>
                    </div>
                  </article>
                  <article className="soft-span">
                    <small>Analytics</small>
                    <strong>Module Overview</strong>
                    <div className="soft-chart">
                      <span /><span /><span /><span /><span /><span /><span />
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
          <div className="soft-laptop__base" />
        </div>

        <div className="soft-phone">
          <div className="soft-phone__notch" />
          <div className="soft-phone__screen">
            <small>Mobile App</small>
            <strong>Controls</strong>
            <div className="soft-phone__cards">
              <span>Tasks</span>
              <span>Alerts</span>
              <span>Sync</span>
            </div>
          </div>
        </div>

        <div className="soft-float soft-float--a">
          <small>Integrations</small>
          <strong>API Bridge</strong>
        </div>
        <div className="soft-float soft-float--b">
          <small>Workflows</small>
          <strong>Queued · Ready</strong>
        </div>
        <div className="soft-float soft-float--c">
          <small>Activity</small>
          <strong>Latest release</strong>
        </div>
      </div>
    </div>
  );
}

function AiComposition() {
  const steps = [
    { label: 'Document', tone: '' },
    { label: 'Extract', tone: '' },
    { label: 'Analyse', tone: 'accent' },
    { label: 'Route', tone: '' },
    { label: 'Approve', tone: '' },
    { label: 'Complete', tone: 'accent' },
  ];

  return (
    <div className="hero-comp hero-comp--ai" aria-hidden="true">
      <div className="ai-stage">
        <div className="ai-rail">
          {steps.map((step, index) => (
            <div key={step.label} className="ai-step">
              <div className={`ai-card${step.tone ? ` ai-card--${step.tone}` : ''}`}>
                <em>{String(index + 1).padStart(2, '0')}</em>
                <strong>{step.label}</strong>
              </div>
              {index < steps.length - 1 ? <span className="ai-connector" /> : null}
            </div>
          ))}
        </div>
        <div className="ai-side">
          <div className="ai-panel">
            <small>INPUT</small>
            <p>Structured source data</p>
          </div>
          <div className="ai-panel ai-panel--mid">
            <small>AI PROCESS</small>
            <p>Classify · Enrich · Decide</p>
          </div>
          <div className="ai-panel">
            <small>ACTION</small>
            <p>Automated handoff</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EngineeringComposition({ image, imageAlt }: { image?: string; imageAlt?: string }) {
  return (
    <div className="hero-comp hero-comp--engineering" aria-hidden="true">
      <div className="eng-stage">
        <div className="eng-main">
          {image ? (
            <Image src={image} alt={imageAlt || ''} width={1400} height={900} priority sizes="(max-width: 900px) 92vw, 640px" />
          ) : null}
          <div className="eng-overlay" />
        </div>
        <div className="eng-ui">
          <Image
            src="/hero-mdat-ui.webp"
            alt=""
            width={900}
            height={680}
            sizes="280px"
          />
        </div>
        <div className="eng-chip eng-chip--a">BOM</div>
        <div className="eng-chip eng-chip--b">PDF</div>
        <div className="eng-chip eng-chip--c">STEP</div>
        <div className="eng-chip eng-chip--d">DXF</div>
        <div className="eng-note">
          <small>Engineering Output</small>
          <strong>Automated package ready</strong>
        </div>
      </div>
    </div>
  );
}

function Interactive3dComposition({ image, imageAlt }: { image?: string; imageAlt?: string }) {
  return (
    <div className="hero-comp hero-comp--3d" aria-hidden="true">
      <div className="sim-stage">
        {image ? (
          <Image
            src={image}
            alt={imageAlt || ''}
            width={1600}
            height={1000}
            priority
            sizes="(max-width: 900px) 94vw, 720px"
          />
        ) : null}
        <div className="sim-fade" />
        <div className="sim-ui sim-ui--top">
          <span>Layout</span>
          <span>Connect</span>
          <span>Simulate</span>
        </div>
        <div className="sim-ui sim-ui--badge">Simulation Studio</div>
      </div>
    </div>
  );
}

function WebComposition() {
  return (
    <div className="hero-comp hero-comp--web" aria-hidden="true">
      <div className="web-stage">
        <div className="web-desktop">
          <div className="web-desktop__bar">
            <i /><i /><i />
            <span>product.metamech</span>
          </div>
          <div className="web-desktop__body">
            <div className="web-desktop__hero" />
            <div className="web-desktop__cols">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
        <div className="web-mobile">
          <div className="web-mobile__screen">
            <b />
            <em />
            <em />
            <em />
          </div>
        </div>
        <div className="web-media">
          <span>Product Video</span>
          <strong>Technical Explainer</strong>
        </div>
      </div>
    </div>
  );
}

export default function HeroVisual({ service }: { service: HeroService }) {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className={`hero-visual__art hero-visual__art--${service.visual}`} data-visual={service.visual}>
        {service.visual === 'software' ? <SoftwareComposition /> : null}
        {service.visual === 'ai' ? <AiComposition /> : null}
        {service.visual === 'engineering' ? (
          <EngineeringComposition image={service.image} imageAlt={service.imageAlt} />
        ) : null}
        {service.visual === 'interactive3d' ? (
          <Interactive3dComposition image={service.image} imageAlt={service.imageAlt} />
        ) : null}
        {service.visual === 'web' ? <WebComposition /> : null}
      </div>
    </div>
  );
}
