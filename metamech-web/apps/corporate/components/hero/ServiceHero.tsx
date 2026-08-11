'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import HeroVisual from './HeroVisuals';
import { heroServices } from './services';

const AUTO_MS = 7000;

export default function ServiceHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const listId = useId();
  const timerRef = useRef<number | null>(null);
  const active = heroServices[activeIndex];

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    if (reducedMotion) return;
    timerRef.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroServices.length);
      setContentKey((k) => k + 1);
    }, AUTO_MS);
    return clearTimer;
  }, [activeIndex, reducedMotion, clearTimer]);

  const select = (index: number) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setContentKey((k) => k + 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      select((activeIndex + 1) % heroServices.length);
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      select((activeIndex - 1 + heroServices.length) % heroServices.length);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      select(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      select(heroServices.length - 1);
    }
  };

  return (
    <section className="service-hero" aria-labelledby={`${listId}-heading`}>
      <div className="mm-container service-hero__grid">
        <article
          className="hero-panel"
          style={{ ['--hero-accent' as string]: active.accent }}
          aria-live="polite"
        >
          <div className="hero-panel__visual-slot" key={`visual-${active.id}`}>
            <HeroVisual service={active} />
          </div>
          <div className="hero-panel__content" key={`copy-${contentKey}`}>
            <p className="hero-brand">MetaMech Solutions</p>
            <p className="hero-panel__label" id={`${listId}-heading`}>
              {active.label}
            </p>
            <h1>{active.title}</h1>
            <p>{active.description}</p>
            <div className="hero-actions">
              <a className="mm-btn mm-btn-primary hero-primary" href={active.primaryCta.href}>
                {active.primaryCta.label}
              </a>
              <a className="mm-btn mm-btn-secondary" href={active.secondaryCta.href}>
                {active.secondaryCta.label}
              </a>
            </div>
            <div className="hero-progress" aria-hidden="true">
              {heroServices.map((service, index) => (
                <i key={service.id} className={index === activeIndex ? 'active' : undefined} />
              ))}
            </div>
          </div>
        </article>

        <div
          className="hero-selectors"
          role="tablist"
          aria-label="MetaMech services"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
        >
          {heroServices.map((service, index) => (
            <button
              key={service.id}
              type="button"
              role="tab"
              id={`${listId}-tab-${service.id}`}
              aria-controls={`${listId}-heading`}
              aria-selected={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              className="hero-selector"
              style={{ ['--selector-accent' as string]: service.accent }}
              data-active={index === activeIndex ? 'true' : 'false'}
              onClick={() => select(index)}
            >
              <span className="hero-selector__index">{service.index}</span>
              <span className="hero-selector__title">{service.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
