'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedContactContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    import('gsap')
      .then((gsapMod) => {
        if (cancelled) return;
        const gsap = gsapMod.default || gsapMod;

        const cards = el.querySelectorAll('.glass-card');
        if (cards.length === 0) return;

        gsap.fromTo(cards,
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'expo.out' }
        );
      })
      .catch(() => {
        const cards = el.querySelectorAll('.glass-card');
        cards.forEach((t) => { (t as HTMLElement).style.opacity = '1'; });
      });

    return () => { cancelled = true; };
  }, []);

  return <div ref={ref}>{children}</div>;
}
