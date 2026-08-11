'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  distance?: number;
}

export default function AnimatedSection({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.8,
  distance = 60,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    import('gsap')
      .then((gsapMod) => {
        if (cancelled) return;
        const gsap = gsapMod.default || gsapMod;

        const fromVars: Record<string, unknown> = { opacity: 0 };
        const toVars: Record<string, unknown> = {
          opacity: 1, duration, delay, ease: 'expo.out', y: 0, x: 0,
        };

        switch (direction) {
          case 'up': fromVars.y = distance; break;
          case 'down': fromVars.y = -distance; break;
          case 'left': fromVars.x = distance; break;
          case 'right': fromVars.x = -distance; break;
        }

        gsap.fromTo(el, fromVars, toVars);
      })
      .catch(() => {
        el.style.opacity = '1';
      });

    return () => { cancelled = true; };
  }, [delay, direction, duration, distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
