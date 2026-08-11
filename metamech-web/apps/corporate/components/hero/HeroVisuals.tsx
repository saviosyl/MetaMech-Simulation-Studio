import Image from 'next/image';
import type { HeroService } from './services';

function SoftwareComposition() {
  return (
    <div className="hero-comp hero-comp--software" aria-hidden="true">
      <div className="hero-window">
        <div className="hero-window__chrome">
          <i /><i /><i />
          <span>product-workspace</span>
        </div>
        <div className="hero-window__body">
          <aside>
            <em />
            <em />
            <em />
            <em />
          </aside>
          <main>
            <div className="hero-window__canvas" />
            <div className="hero-window__cards">
              <b />
              <b />
              <b />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function AiComposition() {
  return (
    <div className="hero-comp hero-comp--ai" aria-hidden="true">
      <div className="hero-flow">
        <div className="hero-flow__node">Documents</div>
        <span className="hero-flow__line" />
        <div className="hero-flow__node hero-flow__node--accent">Process</div>
        <span className="hero-flow__line" />
        <div className="hero-flow__node">Actions</div>
      </div>
      <div className="hero-flow__stack">
        <div /><div /><div />
      </div>
    </div>
  );
}

function WebComposition() {
  return (
    <div className="hero-comp hero-comp--web" aria-hidden="true">
      <div className="hero-browser">
        <div className="hero-browser__bar">
          <i /><i /><i />
          <span>metamechsolutions.com</span>
        </div>
        <div className="hero-browser__stage">
          <div className="hero-browser__hero-block" />
          <div className="hero-browser__rows">
            <span /><span /><span />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroVisual({ service }: { service: HeroService }) {
  if (service.image) {
    return (
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-visual__art hero-visual__art--photo">
          <Image
            src={service.image}
            alt={service.imageAlt || ''}
            width={1400}
            height={900}
            priority={service.id === 'interactive3d' || service.id === 'engineering'}
            sizes="(max-width: 900px) 92vw, 560px"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual__art" data-visual={service.visual}>
        {service.visual === 'software' ? <SoftwareComposition /> : null}
        {service.visual === 'ai' ? <AiComposition /> : null}
        {service.visual === 'web' ? <WebComposition /> : null}
      </div>
    </div>
  );
}
