'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Workflow, TrendingUp, Check } from 'lucide-react';
import gsap from 'gsap';

const kpis = [
  { icon: Zap, label: '1-click outputs' },
  { icon: Workflow, label: 'Workflow fit' },
  { icon: TrendingUp, label: 'ROI focused' },
];

const automateItems = [
  'BOM generation with custom templates',
  'PDF merge + index creation',
  'STEP/DXF batch export',
  'Drawing renumbering',
  'Template + properties sync',
];

const whyChooseItems = [
  'Reduces repetitive manual work',
  'Cuts down design errors',
  'Frees engineers for high-value tasks',
];

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const titleWords = titleRef.current?.querySelectorAll('.title-word');
      if (titleWords) {
        gsap.fromTo(
          titleWords,
          { opacity: 0, y: 30, clipPath: 'inset(0 100% 0 0)' },
          {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0 0% 0 0)',
            duration: 0.6,
            stagger: 0.1,
            ease: 'expo.out',
            delay: 0.3,
          }
        );
      }

      gsap.fromTo(
        leftCardRef.current,
        { opacity: 0, rotateY: -30, x: -50 },
        { opacity: 1, rotateY: 0, x: 0, duration: 0.8, ease: 'expo.out', delay: 0.2 }
      );

      gsap.fromTo(
        rightCardRef.current,
        { opacity: 0, rotateY: 15, x: 50 },
        { opacity: 1, rotateY: 0, x: 0, duration: 0.8, ease: 'expo.out', delay: 0.5 }
      );

      gsap.fromTo(
        '.kpi-item',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'expo.out', delay: 1.2 }
      );

      gsap.fromTo(
        '.cta-btn',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 1 }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-[70px]"
      style={{ perspective: '1000px' }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy">
        <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-teal/15 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-20 right-10 w-[300px] h-[300px] bg-gold/10 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 right-1/4 w-[250px] h-[250px] bg-teal/[0.08] rounded-full blur-[80px] animate-pulse-glow" />
        {/* Rotating squares */}
        <div className="absolute top-[15%] right-[8%] w-[120px] h-[120px] border border-cyan-500/20 rounded-lg"
          style={{ animation: 'border-rotate 12s linear infinite' }} />
        <div className="absolute top-[12%] right-[6%] w-[180px] h-[180px] border border-gold/10 rounded-lg"
          style={{ animation: 'border-rotate 18s linear infinite reverse' }} />
        <div className="absolute bottom-[20%] left-[5%] w-[100px] h-[100px] border border-cyan-500/15 rounded-lg"
          style={{ animation: 'border-rotate 15s linear infinite' }} />
        <div className="absolute bottom-[25%] left-[3%] w-[150px] h-[150px] border border-gold/8 rounded-lg"
          style={{ animation: 'border-rotate 20s linear infinite reverse' }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Card */}
          <div
            ref={leftCardRef}
            className="glass-card p-6 sm:p-8 lg:p-10"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <h1
              ref={titleRef}
              className="font-orbitron text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-bold text-white leading-tight mb-6"
            >
              <span className="title-word inline-block">ENGINEERING</span>{' '}
              <span className="title-word inline-block text-gradient-teal">AUTOMATION</span>{' '}
              <span className="title-word inline-block">THAT</span>{' '}
              <span className="title-word inline-block">SAVES</span>{' '}
              <span className="title-word inline-block text-gradient-gold">DESIGN</span>{' '}
              <span className="title-word inline-block text-gradient-gold">HOURS</span>
            </h1>

            <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl">
              SolidWorks automation tools and macros designed to reduce repetitive work,
              minimize errors, and accelerate your product development workflow.
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
              <Link href="/simulation-studio" className="cta-btn flex items-center gap-2 px-6 py-3 rounded-xl font-orbitron font-bold text-sm sm:text-base bg-gradient-to-r from-gold to-gold-light text-navy hover:shadow-glow-gold transition-all duration-300 hover:scale-105">
                🏭 Simulation Studio
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-8">
              <Link href="/tools" className="cta-btn btn-primary flex items-center gap-2">
                Explore Tools
                <ArrowRight size={18} />
              </Link>
              <Link href="/pricing" className="cta-btn btn-secondary flex items-center gap-2">
                Calculate ROI
                <ArrowRight size={18} />
              </Link>
              <Link href="/download" className="cta-btn btn-secondary flex items-center gap-2">
                Download 3-Day Trial
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {kpis.map((kpi, index) => (
                <div key={index} className="kpi-item kpi-card flex items-center gap-2 group cursor-default">
                  <kpi.icon size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-gray-300 font-medium">{kpi.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card */}
          <div
            ref={rightCardRef}
            className="glass-card p-6 sm:p-8 border-gradient"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <h2 className="font-orbitron text-xl sm:text-2xl font-bold text-white mb-6">
              What You Can <span className="text-gradient-teal">Automate</span>
            </h2>

            <ul className="space-y-3 mb-8">
              {automateItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-400 group">
                  <Check size={18} className="text-cyan-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="group-hover:text-gray-300 transition-colors">{item}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/10 pt-6">
              <h3 className="font-orbitron text-lg font-bold text-white mb-4">
                Why Teams Choose <span className="text-gradient-gold">MetaMech</span>
              </h3>
              <ul className="space-y-2">
                {whyChooseItems.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-400 text-sm group">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold group-hover:scale-150 transition-transform" />
                    <span className="group-hover:text-gray-300 transition-colors">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent pointer-events-none" />
    </section>
  );
}
