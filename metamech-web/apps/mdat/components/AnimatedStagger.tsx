'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface AnimatedStaggerProps {
  children: ReactNode;
  className?: string;
  childSelector?: string;
  stagger?: number;
  delay?: number;
  duration?: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  rotate3D?: boolean;
}

export default function AnimatedStagger({
  children,
  className = '',
  childSelector = ':scope > *',
  stagger = 0.12,
  delay = 0,
  duration = 0.7,
  distance = 50,
  direction = 'up',
  rotate3D = false,
}: AnimatedStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll(childSelector);
    if (targets.length === 0) return;

    let cancelled = false;

    import('gsap')
      .then((gsapMod) => {
        if (cancelled) return;
        const gsap = gsapMod.default || gsapMod;

        const fromVars: Record<string, unknown> = { opacity: 0 };
        const toVars: Record<string, unknown> = {
          opacity: 1, duration, stagger, delay, ease: 'expo.out',
          y: 0, x: 0,
        };

        switch (direction) {
          case 'up': fromVars.y = distance; break;
          case 'down': fromVars.y = -distance; break;
          case 'left': fromVars.x = distance; break;
          case 'right': fromVars.x = -distance; break;
        }

        if (rotate3D) {
          fromVars.rotateY = -15;
          fromVars.rotateX = 8;
          fromVars.transformPerspective = 800;
          toVars.rotateY = 0;
          toVars.rotateX = 0;
          toVars.transformPerspective = 800;
        }

        gsap.fromTo(targets, fromVars, toVars);
      })
      .catch(() => {
        targets.forEach((t) => { (t as HTMLElement).style.opacity = '1'; });
      });

    return () => { cancelled = true; };
  }, [childSelector, stagger, delay, duration, distance, direction, rotate3D]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
