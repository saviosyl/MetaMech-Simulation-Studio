import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div className="mm-section-heading">
      {eyebrow ? <p className="mm-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="mm-section-desc">{description}</p> : null}
    </div>
  );
}
