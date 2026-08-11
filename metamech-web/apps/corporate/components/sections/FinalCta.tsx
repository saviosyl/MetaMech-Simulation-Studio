import Link from 'next/link';

export default function FinalCta() {
  return (
    <section className="mm-section" aria-labelledby="final-cta-heading">
      <div className="mm-container">
        <div className="cta-panel">
          <div>
            <p className="mm-eyebrow">Start a project</p>
            <h2 id="final-cta-heading" style={{ margin: 0, fontSize: 'clamp(1.7rem, 3vw, 2.2rem)' }}>
              Ready to build something real?
            </h2>
            <p style={{ margin: '0.75rem 0 0', color: 'var(--mm-text-secondary)', maxWidth: 480 }}>
              Tell us about the software, automation, engineering or digital product you need.
            </p>
          </div>
          <Link
            href="/contact/"
            className="mm-btn mm-btn-primary"
            style={{
              background: 'linear-gradient(135deg, #3F7CFF, #20C7C9)',
              color: '#fff',
              border: 'none',
              padding: '0.9rem 1.4rem',
              borderRadius: 12,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Start a Project
          </Link>
        </div>
      </div>
    </section>
  );
}
