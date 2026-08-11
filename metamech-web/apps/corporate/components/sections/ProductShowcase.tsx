import Link from 'next/link';
import { products } from '@metamech/shared';

const mdatUrl = process.env.NEXT_PUBLIC_MDAT_URL || 'http://localhost:3000';
const simulationUrl = process.env.NEXT_PUBLIC_SIMULATION_URL || 'http://localhost:3002';
const goldmetaUrl = process.env.NEXT_PUBLIC_GOLDMETA_URL || 'https://goldmeta.app';

const hrefById: Record<string, string> = {
  mdat: '/products/mdat/',
  simulation: '/products/simulation-studio/',
  goldmeta: '/products/goldmeta/',
};

const externalById: Record<string, string> = {
  mdat: mdatUrl,
  simulation: simulationUrl,
  goldmeta: goldmetaUrl,
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
          {products.map((product) => (
            <article
              key={product.id}
              className={`product-card${product.id === 'goldmeta' ? ' goldmeta' : ''}`}
              style={{ ['--card-accent' as string]: product.accent }}
            >
              <p className="category">{product.category}</p>
              <h3>{product.name}</h3>
              <p className="label">{product.label}</p>
              <p>{product.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                <Link href={hrefById[product.id]}>{product.cta}</Link>
                <a href={externalById[product.id]} rel="noopener noreferrer">
                  Open destination →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
