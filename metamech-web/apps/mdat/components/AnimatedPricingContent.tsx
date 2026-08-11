'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedPricingContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    import('gsap')
      .then((gsapMod) => {
        if (cancelled) return;
        const gsap = gsapMod.default || gsapMod;

        const planCards = el.querySelectorAll('[data-animate="plan-card"]');
        if (planCards.length > 0) {
          gsap.fromTo(planCards,
            { opacity: 0, y: 60, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: 'expo.out' }
          );
        }

        const roiSection = el.querySelector('[data-animate="roi"]');
        if (roiSection) {
          gsap.fromTo(roiSection,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.3 }
          );
        }

        const faqItems = el.querySelectorAll('[data-animate="faq"]');
        if (faqItems.length > 0) {
          gsap.fromTo(faqItems,
            { opacity: 0, y: 30, x: -20 },
            { opacity: 1, y: 0, x: 0, duration: 0.5, stagger: 0.08, ease: 'expo.out', delay: 0.3 }
          );
        }

        const checkout = el.querySelector('[data-animate="checkout"]');
        if (checkout) {
          gsap.fromTo(checkout,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', delay: 0.3 }
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
