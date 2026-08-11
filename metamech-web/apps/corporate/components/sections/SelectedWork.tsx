import Image from 'next/image';
import Link from 'next/link';

const work = [
  {
    title: 'MetaMech MDAT',
    category: 'Mechanical Design Automation',
    body: 'SolidWorks workflow automation for BOM, PDF packages, STEP/DXF export, renumbering and engineering utilities.',
    href: '/products/mdat/',
    image: '/metamech-logo.png',
    accent: '#3F7CFF',
  },
  {
    title: 'Simulation Studio',
    category: 'Interactive 3D Engineering',
    body: 'Browser-based industrial layout, equipment configuration and demonstration environment.',
    href: '/products/simulation-studio/',
    image: '/sim-hero-main-light-v01.png',
    accent: '#20C7C9',
  },
  {
    title: 'GoldMeta',
    category: 'AI Market Intelligence',
    body: 'AI-assisted market structure and decision-support technology — presented as a MetaMech Solutions product.',
    href: '/products/goldmeta/',
    image: '/goldmeta-mark.png',
    accent: '#10263A',
  },
];

export default function SelectedWork() {
  return (
    <section className="mm-section" id="work" aria-labelledby="work-heading">
      <div className="mm-container">
        <div className="mm-section-heading">
          <p className="mm-eyebrow">Selected work</p>
          <h2 id="work-heading">Proof through products we ship</h2>
          <p className="mm-section-desc">
            Featured work is drawn from MetaMech’s own products — not fabricated client logos or claims.
          </p>
        </div>

        <div className="product-grid" style={{ marginTop: '2rem' }}>
          {work.map((item) => (
            <article key={item.title} className="product-card" style={{ ['--card-accent' as string]: item.accent }}>
              <div
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid var(--mm-border)',
                  background: '#F7F9FC',
                  aspectRatio: '16 / 10',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Image
                  src={item.image}
                  alt={`${item.title} visual`}
                  width={640}
                  height={400}
                  style={{ width: '100%', height: '100%', objectFit: item.title === 'MetaMech MDAT' || item.title === 'GoldMeta' ? 'contain' : 'cover', padding: item.title === 'Simulation Studio' ? 0 : 24 }}
                  loading="lazy"
                />
              </div>
              <p className="category">{item.category}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link href={item.href}>View product →</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
