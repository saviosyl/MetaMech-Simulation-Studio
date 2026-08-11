import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GoldMeta',
  description:
    'GoldMeta — AI Market Intelligence. A MetaMech Solutions Product for market structure analysis and decision support.',
};

const goldmetaUrl = process.env.NEXT_PUBLIC_GOLDMETA_URL || '';

export default function GoldmetaProductPage() {
  return (
    <section className="page-hero">
      <div className="mm-container" style={{ paddingBottom: '4rem' }}>
        <div
          className="about-panel"
          style={{
            background: 'linear-gradient(160deg, #10263A 0%, #1A3A55 100%)',
            color: '#fff',
            borderColor: '#1d3952',
          }}
        >
          <p className="mm-eyebrow" style={{ color: '#FFB84A' }}>
            AI Market Intelligence
          </p>
          <h1 style={{ color: '#fff' }}>GoldMeta</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>A MetaMech Solutions Product</p>
          <p style={{ color: 'rgba(255,255,255,0.78)', maxWidth: 640 }}>
            AI-assisted market structure, analysis and trading decision-support technology. GoldMeta retains
            its own product identity — presented here as a product developed by MetaMech.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
            No investment returns, profits or trading performance are promised.
          </p>
          <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
            <Image
              src="/goldmeta-surface.webp"
              alt="GoldMeta market structure workspace"
              width={960}
              height={560}
              style={{ width: 'min(100%, 520px)', height: 'auto', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <Image
              src="/goldmeta-mark-transparent.png"
              alt="GoldMeta mark"
              width={72}
              height={72}
            />
            {goldmetaUrl ? (
              <a
                href={goldmetaUrl}
                rel="noopener noreferrer"
                style={{
                  background: '#FFB84A',
                  color: '#10263A',
                  padding: '0.85rem 1.35rem',
                  borderRadius: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Visit GoldMeta
              </a>
            ) : null}
            <Link href="/contact/" style={{ color: '#fff', fontWeight: 600 }}>
              Talk to MetaMech →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
