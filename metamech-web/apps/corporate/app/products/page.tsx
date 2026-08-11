import type { Metadata } from 'next';
import ProductShowcase from '@/components/sections/ProductShowcase';

export const metadata: Metadata = {
  title: 'Products',
  description: 'MetaMech MDAT, Simulation Studio and GoldMeta — products built by MetaMech Solutions.',
};

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="mm-container">
          <p className="mm-eyebrow">Products</p>
          <h1>Products built by MetaMech</h1>
          <p>Explore the flagship products developed by MetaMech Solutions.</p>
        </div>
      </section>
      <ProductShowcase />
    </>
  );
}
