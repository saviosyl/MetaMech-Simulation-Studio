import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="mm-container site-footer__grid">
        <div>
          <div className="brand-lockup" style={{ marginBottom: '0.85rem' }}>
            <Image src="/metamech-logo.png" alt="" width={40} height={40} />
            <span>
              <strong>MetaMech Solutions</strong>
              <span>Built from engineering. Expanded through technology.</span>
            </span>
          </div>
          <p style={{ color: 'var(--mm-text-secondary)', margin: 0, maxWidth: 360, lineHeight: 1.55 }}>
            MetaMech builds its own technology products and applies the same product-development
            mindset to customer projects.
          </p>
        </div>

        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Products</h3>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <Link href="/products/mdat/">MetaMech MDAT</Link>
            <Link href="/products/simulation-studio/">Simulation Studio</Link>
            <Link href="/products/goldmeta/">GoldMeta</Link>
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Company</h3>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <Link href="/services/">Services</Link>
            <Link href="/work/">Work</Link>
            <Link href="/about/">About</Link>
            <Link href="/contact/">Contact</Link>
            <a href="mailto:hi@metamechsolutions.com">hi@metamechsolutions.com</a>
          </div>
        </div>
      </div>
      <div className="mm-container" style={{ marginTop: '2rem', color: 'var(--mm-text-secondary)', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} MetaMech Solutions. All rights reserved.
      </div>
    </footer>
  );
}
