'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Simulation Studio', href: '/simulation-studio', highlight: true },
  { name: 'Tools', href: '/tools' },
  { name: 'Services', href: '/services' },
  { name: 'Industries', href: '/industries' },
  { name: 'Blog', href: '/blog' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Download Trial', href: '/download' },
  { name: 'Contact', href: '/contact' },
];

/** Future parent site. Local preview default: corporate app on :3001 */
const CORPORATE_URL =
  process.env.NEXT_PUBLIC_CORPORATE_URL || 'http://localhost:3001';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
          setIsScrolled(currentScrollY > 50);
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled
            ? 'bg-navy/85 backdrop-blur-xl border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center justify-between h-[70px]">
            {/* Logo — MetaMech MDAT product branding (appearance preserved) */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative p-1.5 rounded-xl bg-white border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all duration-300 group-hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] group-hover:border-cyan-400/60 group-hover:scale-105">
                <Image
                  src="/metamech-logo.png"
                  alt="MetaMech MDAT"
                  width={44}
                  height={44}
                  className="h-11 w-auto"
                  priority
                />
              </div>
              <span className="hidden sm:flex flex-col leading-tight">
                <span className="text-white text-sm font-semibold tracking-wide">MetaMech MDAT</span>
                <span className="text-gray-400 text-[11px]">Mechanical Design Automation Tools</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm transition-colors duration-200 group ${
                    (link as any).highlight
                      ? 'text-gold font-semibold hover:text-gold-light'
                      : 'text-gray-400 hover:text-cyan-400'
                  }`}
                >
                  {link.name}
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 transition-all duration-250 group-hover:w-4/5 ${
                    (link as any).highlight ? 'bg-gold' : 'bg-cyan-400'
                  }`} />
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <a
                href={CORPORATE_URL}
                className="hidden md:inline text-xs text-gray-500 hover:text-cyan-400 transition-colors"
              >
                MetaMech Solutions
              </a>
              <Link href="/contact" className="hidden sm:block btn-primary text-sm">
                REQUEST A DEMO
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div
          className="absolute inset-0 bg-navy/95 backdrop-blur-xl"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div className="relative h-full flex flex-col items-center justify-center gap-6 p-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-orbitron text-white hover:text-cyan-400 transition-colors duration-200"
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setIsMobileMenuOpen(false)}
            className="mt-4 btn-primary text-lg"
          >
            REQUEST A DEMO
          </Link>
        </div>
      </div>
    </>
  );
}
