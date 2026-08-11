import Link from 'next/link';
import Image from 'next/image';
import { products } from '@metamech/shared';

const mdatUrl = process.env.NEXT_PUBLIC_MDAT_URL || 'http://localhost:3000';
const simulationUrl = process.env.NEXT_PUBLIC_SIMULATION_URL || 'http://localhost:3002';
const goldmetaExternal = process.env.NEXT_PUBLIC_GOLDMETA_URL || '';

const visuals: Record<string, { src: string; alt: string; contain?: boolean }> = {
  mdat: { src: '/hero-mdat.webp', alt: 'MetaMech MDAT interface', contain: false },
  simulation: { src: '/hero-sim-factory.webp', alt: 'MetaMech Simulation Studio industrial layout', contain: false },
  goldmeta: { src: '/goldmeta-mark-512.png', alt: 'GoldMeta mark', contain: true },
};

export default function ProductShowcase() {
  return (
    <section className="mm-section" id="products" aria-labelledby="products-heading">
      <div className="mm-container">
        <div className="mm-section-heading">
          <p className="mm-eyebrow">Products</p>
          <h2 id="products-heading">Products built by MetaMech</h2>
          <p className="mm-section-desc">
            Flagship products developed in-house — and the foundation of how we deliver for clients.
          </p>
        </div>

        <div className="product-grid" style={{ marginTop: '2rem' }}>
          {products.map((product) => {
            const visual = visuals[product.id];
            const internalHref =
              product.id === 'mdat'
                ? '/products/mdat/'
                : product.id === 'simulation'
                  ? '/products/simulation-studio/'
                  : '/products/goldmeta/';
            const external =
              product.id === 'mdat'
                ? mdatUrl
                : product.id === 'simulation'
                  ? simulationUrl
                  : goldmetaExternal;

            return (
              <article
                key={product.id}
                className={`product-card${product.id === 'goldmeta' ? ' goldmeta' : ''}`}
                style={{ ['--card-accent' as string]: product.accent }}
              >
                {visual ? (
                  <div className={`product-card__media${visual.contain ? ' is-contain' : ''}`}>
                    <Image
                      src={visual.src}
                      alt={visual.alt}
                      width={720}
                      height={420}
                      loading="lazy"
                      sizes="(max-width: 900px) 100vw, 360px"
                    />
                  </div>
                ) : null}
                <p className="category">{product.category}</p>
                <h3>{product.name}</h3>
                <p className="label">{product.label}</p>
                <p>{product.description}</p>
                <div className="product-card__actions">
                  <Link href={internalHref}>{product.cta}</Link>
                  {external ? (
                    <a href={external} rel="noopener noreferrer">
                      Open destination →
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
