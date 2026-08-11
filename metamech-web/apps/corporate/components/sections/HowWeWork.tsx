import { processSteps } from '@metamech/shared';

export default function HowWeWork() {
  return (
    <section className="mm-section" id="process" aria-labelledby="process-heading">
      <div className="mm-container">
        <div className="mm-section-heading">
          <p className="mm-eyebrow">How we work</p>
          <h2 id="process-heading">A clear path from problem to product</h2>
        </div>
        <div className="process-row" style={{ marginTop: '2rem' }}>
          {processSteps.map((step) => (
            <article key={step.id} className="process-step">
              <strong>{step.id}</strong>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
