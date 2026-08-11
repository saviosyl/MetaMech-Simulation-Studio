'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedIndustriesContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    import('gsap')
      .then((gsapMod) => {
        if (cancelled) return;
        const gsap = gsapMod.default || gsapMod;

        const chips = el.querySelectorAll('[data-animate="chip"]');
        if (chips.length > 0) {
          gsap.fromTo(chips,
            { opacity: 0, y: 30, scale: 0.8 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.7)' }
          );
        }

        const cards = el.querySelectorAll('[data-animate="feature-card"]');
        if (cards.length > 0) {
          gsap.fromTo(cards,
            { opacity: 0, y: 50, rotateY: -10, transformPerspective: 800 },
            { opacity: 1, y: 0, rotateY: 0, transformPerspective: 800, duration: 0.7, stagger: 0.15, ease: 'expo.out', delay: 0.3 }
          );
        }
      })
      .catch(() => {
        const all = el.querySelectorAll('[data-animate]');
        all.forEach((t) => { (t as HTMLElement).style.opacity = '1'; });
      });

    return () => { cancelled = true; };
  }, []);

  return <div ref={ref}>{children}</div>;
}
