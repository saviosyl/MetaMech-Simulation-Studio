'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { href: '/products/', label: 'Products' },
  { href: '/services/', label: 'Services' },
  { href: '/work/', label: 'Work' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="mm-container site-header__inner">
        <Link href="/" className="brand-lockup" aria-label="MetaMech Solutions home">
          <Image src="/metamech-logo.png" alt="" width={46} height={46} priority />
          <span>
            <strong>MetaMech Solutions</strong>
            <span>Technology & Product Development</span>
          </span>
        </Link>

        <nav className="nav-desktop" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/contact/"
          className="nav-cta mm-btn mm-btn-primary"
          style={{
            background: 'linear-gradient(135deg, #3F7CFF, #20C7C9)',
            color: '#fff',
            border: 'none',
            padding: '0.62rem 0.95rem',
            borderRadius: 11,
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          Start a Project
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div id="mobile-nav" className={`mm-container nav-mobile${open ? ' open' : ''}`}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link href="/contact/" onClick={() => setOpen(false)}>
          Start a Project
        </Link>
      </div>
    </header>
  );
}
