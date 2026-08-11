export default function AboutPositioning() {
  return (
    <section className="mm-section" id="about" aria-labelledby="about-heading">
      <div className="mm-container">
        <div className="about-panel">
          <p className="mm-eyebrow">About</p>
          <h2 id="about-heading" style={{ margin: '0 0 1rem', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '-0.02em' }}>
            Built from engineering.
            <br />
            Expanded through technology.
          </h2>
          <p style={{ margin: '0 0 0.85rem', color: 'var(--mm-text-secondary)', maxWidth: 720, lineHeight: 1.65 }}>
            MetaMech Solutions began with the goal of automating repetitive engineering work and creating
            better digital tools.
          </p>
          <p style={{ margin: '0 0 0.85rem', color: 'var(--mm-text-secondary)', maxWidth: 720, lineHeight: 1.65 }}>
            That approach has expanded into software development, interactive 3D, automation, AI and digital
            product development.
          </p>
          <p style={{ margin: 0, color: 'var(--mm-text-secondary)', maxWidth: 720, lineHeight: 1.65 }}>
            MetaMech builds its own technology products and applies the same product-development mindset to
            customer projects.
          </p>
        </div>
      </div>
    </section>
  );
}
