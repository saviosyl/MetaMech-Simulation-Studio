import Image from 'next/image';

const appUrl = process.env.NEXT_PUBLIC_SIMULATION_APP_URL || 'https://metamech-studio.pages.dev';
const corporateUrl = process.env.NEXT_PUBLIC_CORPORATE_URL || 'http://localhost:3001';

export default function Page() {
  return (
    <div className="wrap">
      <div className="hero">
        <div>
          <p className="eyebrow">MetaMech Simulation Studio</p>
          <h1>Interactive 3D engineering for industrial systems</h1>
          <p>
            Design, configure and visualise conveyors, warehouse environments, equipment layouts and
            technical demonstrations in a browser-based environment.
          </p>
          <div className="actions">
            <a className="btn btn-primary" href={appUrl} rel="noopener noreferrer">
              Open Simulation Studio
            </a>
            <a className="btn btn-secondary" href={`${corporateUrl}/contact/`}>
              Book a demo
            </a>
            <a className="btn btn-secondary" href={corporateUrl}>
              MetaMech Solutions
            </a>
          </div>
        </div>
        <div className="visual">
          <Image
            src="/sim-hero-main-light-v01.png"
            alt="Simulation Studio layout visualisation"
            width={1200}
            height={800}
            priority
          />
        </div>
      </div>

      <div className="grid">
        <article className="card">
          <h3>Layout visualisation</h3>
          <p>Compose industrial layouts with conveyors, racks, safety rails and operator context.</p>
        </article>
        <article className="card">
          <h3>Configurable equipment</h3>
          <p>Place and configure modular equipment for clearer technical conversations.</p>
        </article>
        <article className="card">
          <h3>Customer demonstrations</h3>
          <p>Present interactive motion and system behaviour without shipping a desktop install.</p>
        </article>
      </div>

      <p className="note">
        Marketing preview for future <code>simulation.metamechsolutions.com</code>. The application remains
        in MetaMech-Simulation-Studio and is not redesigned here.
      </p>
    </div>
  );
}
