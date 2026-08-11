'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedToolsContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    import('gsap')
      .then((gsapMod) => {
        if (cancelled) return;
        const gsap = gsapMod.default || gsapMod;

        const cards = el.querySelectorAll('[data-animate="tool-card"]');
        if (cards.length > 0) {
          gsap.fromTo(cards,
            { opacity: 0, y: 60, rotateY: -12, transformPerspective: 800 },
            { opacity: 1, y: 0, rotateY: 0, transformPerspective: 800, duration: 0.7, stagger: 0.15, ease: 'expo.out' }
          );
        }

        const benefitCards = el.querySelectorAll('[data-animate="benefit"]');
        if (benefitCards.length > 0) {
          gsap.fromTo(benefitCards,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'expo.out', delay: 0.3 }
          );
        }

        const features = el.querySelectorAll('[data-animate="feature"]');
        if (features.length > 0) {
          gsap.fromTo(features,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'expo.out', delay: 0.5 }
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
