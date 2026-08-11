import Image from 'next/image';
import Link from 'next/link';

const work = [
  {
    title: 'MetaMech MDAT',
    category: 'Mechanical Design Automation',
    body: 'SolidWorks workflow automation for BOM, PDF packages, STEP/DXF export, renumbering and engineering utilities.',
    href: '/products/mdat/',
    image: '/hero-mdat-workspace.webp',
    accent: '#3F7CFF',
    contain: false,
    dark: false,
  },
  {
    title: 'Simulation Studio',
    category: 'Interactive 3D Engineering',
    body: 'Browser-based industrial layout, equipment configuration and demonstration environment.',
    href: '/products/simulation-studio/',
    image: '/hero-sim-factory-crop.webp',
    accent: '#20C7C9',
    contain: false,
    dark: false,
  },
  {
    title: 'GoldMeta',
    category: 'AI Market Intelligence',
    body: 'AI-assisted market structure and decision-support technology — presented as a MetaMech Solutions product.',
    href: '/products/goldmeta/',
    image: '/goldmeta-surface.webp',
    accent: '#10263A',
    contain: false,
    dark: true,
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
            Featured work is drawn from MetaMech’s own products — the technology we design, build and ship.
          </p>
        </div>

        <div className="product-grid" style={{ marginTop: '2rem' }}>
          {work.map((item) => (
            <article
              key={item.title}
              className={`product-card${item.dark ? ' goldmeta' : ''}`}
              style={{ ['--card-accent' as string]: item.accent }}
            >
              <div className={`product-card__media${item.contain ? ' is-contain' : ''}`}>
                <Image
                  src={item.image}
                  alt={`${item.title} visual`}
                  width={720}
                  height={420}
                  loading="lazy"
                  sizes="(max-width: 900px) 100vw, 360px"
                />
              </div>
              <p className="category">{item.category}</p>
              <h3>{item.title}</h3>
              {!item.dark ? null : <p className="label">A MetaMech Solutions Product</p>}
              <p>{item.body}</p>
              <Link href={item.href}>View product →</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
