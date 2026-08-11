import Image from 'next/image';

const goldmetaUrl = process.env.NEXT_PUBLIC_GOLDMETA_URL || 'https://goldmeta.app';
const corporateUrl = process.env.NEXT_PUBLIC_CORPORATE_URL || 'http://localhost:3001';

export default function Page() {
  return (
    <div className="wrap">
      <div className="card">
        <Image className="mark" src="/goldmeta-mark.png" alt="GoldMeta" width={96} height={96} priority />
        <p className="eyebrow">AI Market Intelligence</p>
        <h1>GoldMeta</h1>
        <p className="sub">A MetaMech Solutions Product</p>
        <p>
          GoldMeta is AI-assisted market structure, analysis and trading decision-support technology. It
          keeps its own product identity while being developed by MetaMech Solutions.
        </p>
        <div className="actions">
          <a className="btn btn-primary" href={goldmetaUrl} rel="noopener noreferrer">
            Visit GoldMeta
          </a>
          <a className="btn btn-secondary" href={corporateUrl}>
            MetaMech Solutions
          </a>
        </div>
        <p className="disclaimer">
          This page does not promise investment returns, guaranteed profits or trading performance. Product
          application code remains in the GOLDSMETA repository.
        </p>
      </div>
    </div>
  );
}
