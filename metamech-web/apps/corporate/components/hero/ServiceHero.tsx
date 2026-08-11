'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { heroServices, type HeroService } from './services';

const AUTO_MS = 7000;

function HeroVisual({ service }: { service: HeroService }) {
  if (service.image) {
    return (
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-visual__art">
          <Image
            src={service.image}
            alt=""
            width={960}
            height={720}
            priority={service.id === 'interactive3d'}
            sizes="(max-width: 900px) 90vw, 560px"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual__art" data-visual={service.visual}>
        <div className="hero-visual__nodes">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default function ServiceHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
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
    }, AUTO_MS);
    return clearTimer;
  }, [activeIndex, reducedMotion, clearTimer]);

  const select = (index: number) => {
    setActiveIndex(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % heroServices.length);
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + heroServices.length) % heroServices.length);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(heroServices.length - 1);
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
          <HeroVisual service={active} />
          <div className="hero-panel__content">
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
                <i
                  key={service.id}
                  className={index === activeIndex ? 'active' : undefined}
                />
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
              aria-selected={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              className={`hero-selector${index === activeIndex ? ' is-active-mobile' : ''}`}
              style={{
                ['--selector-accent' as string]: service.accent,
                display: undefined,
              }}
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
