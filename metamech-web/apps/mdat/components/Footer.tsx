'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Linkedin, Youtube } from 'lucide-react';

const navLinks = [
  { name: 'Tools', href: '/tools' },
  { name: 'Services', href: '/services' },
  { name: 'Industries', href: '/industries' },
  { name: 'Blog', href: '/blog' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Download Trial', href: '/download' },
  { name: 'Contact', href: '/contact' },
];

const legalLinks = [
  { name: 'Privacy Policy', href: '/privacy-policy' },
  { name: 'Terms of Service', href: '/terms' },
];

const socialLinks = [
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/metamech-solutions/' },
  { name: 'YouTube', icon: Youtube, href: '#' },
];

export default function Footer() {
  return (
    <footer className="relative py-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-navy">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-teal/5 rounded-full blur-[150px]" />
      </div>

      {/* Top Border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Logo & Tagline */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-4 group">
            <div className="relative p-3 rounded-2xl bg-white border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 group-hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] group-hover:border-cyan-400/70 group-hover:scale-105">
              <Image
                src="/metamech-logo.png"
                alt="MetaMech Solutions Logo"
                width={64}
                height={64}
                className="h-16 w-auto"
              />
            </div>
          </Link>
          <p className="text-gray-300 text-sm font-medium mb-1">MetaMech MDAT</p>
          <p className="text-gray-500 text-xs mb-3">
            Mechanical Design Automation Tools · A MetaMech Solutions Product
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Engineering automation that saves design hours. Transform your SolidWorks workflow today.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_CORPORATE_URL || 'http://localhost:3001'}
            className="inline-block mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← MetaMech Solutions
          </a>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-gray-400 hover:text-cyan-400 text-sm transition-colors duration-200 relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan-400 transition-all duration-250 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-4 mb-10">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 hover:scale-110 hover:rotate-6"
              aria-label={social.name}
            >
              <social.icon size={20} />
            </a>
          ))}
        </div>

        {/* Legal Links & Copyright */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="hover:text-cyan-400 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <p className="text-gray-600 text-sm">
              © 2026 MetaMech Solutions. All rights reserved.
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-gray-600/60 text-xs text-center mt-6 max-w-3xl mx-auto leading-relaxed">
            MetaMech Solutions is an independent software provider and is not affiliated with, endorsed by, or sponsored by Dassault Systèmes, SolidWorks Corporation, or DriveWorks Ltd. SolidWorks® is a registered trademark of Dassault Systèmes SolidWorks Corporation. DriveWorks® is a registered trademark of DriveWorks Ltd. All other trademarks are the property of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
