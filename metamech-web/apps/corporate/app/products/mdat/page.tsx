import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MetaMech MDAT',
  description:
    'MetaMech Mechanical Design Automation Tools — SolidWorks workflow automation for BOM, PDF, STEP, DXF and engineering utilities.',
};

const mdatUrl = process.env.NEXT_PUBLIC_MDAT_URL || '';

export default function MdatProductPage() {
  return (
    <section className="page-hero">
      <div className="mm-container" style={{ paddingBottom: '4rem' }}>
        <p className="mm-eyebrow">Mechanical Design Automation</p>
        <h1>MetaMech MDAT</h1>
        <p>
          MetaMech Mechanical Design Automation Tools automate repetitive CAD and mechanical engineering
          workflows — SolidWorks automation, BOM, PDF drawing packages, STEP/DXF export, renumbering,
          templates, custom properties and OneClick batch processes.
        </p>
        <p style={{ marginTop: '0.75rem', color: 'var(--mm-text-secondary)' }}>
          A MetaMech Solutions Product
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
          {mdatUrl ? (
            <a
              href={mdatUrl}
              className="mm-btn mm-btn-primary"
              style={{
                background: 'linear-gradient(135deg, #3F7CFF, #20C7C9)',
                color: '#fff',
                border: 'none',
                padding: '0.85rem 1.35rem',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Explore MDAT site
            </a>
          ) : null}
          <Link href="/contact/" className="mm-btn mm-btn-secondary">
            Start a Project
          </Link>
        </div>
      </div>
    </section>
  );
}
