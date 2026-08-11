const groups = [
  {
    id: 'software-apps',
    title: 'Software & Apps',
    accent: '#3F7CFF',
    items: [
      'Custom software',
      'Web applications',
      'Mobile/cross-platform applications',
      'SaaS platforms',
      'Internal business tools',
      'Dashboards',
      'Customer portals',
      'API integrations',
      'Database-driven applications',
    ],
  },
  {
    id: 'ai-automation',
    title: 'AI & Automation',
    accent: '#20C7C9',
    items: [
      'AI integrations',
      'AI assistants',
      'Workflow automation',
      'Document processing',
      'Intelligent search',
      'Decision-support systems',
      'Reporting automation',
      'Business-process automation',
    ],
  },
  {
    id: 'engineering-3d',
    title: 'Engineering & 3D',
    accent: '#43D7FF',
    items: [
      'CAD automation',
      'SolidWorks automation',
      'DraftSight automation',
      'Engineering utilities',
      'Custom engineering applications',
      'Interactive 3D',
      'Industrial visualisation',
      'Product configurators',
      'Technical simulation',
    ],
  },
  {
    id: 'web-creative',
    title: 'Web & Creative',
    accent: '#35C98B',
    items: [
      'Premium websites',
      'Product websites',
      'Landing pages',
      'UI/UX implementation',
      'Digital product launches',
      'AI-assisted product videos',
      'Technical explainer videos',
      'Social media creative',
      'Product visualisation',
    ],
  },
];

export default function Capabilities() {
  return (
    <section className="mm-section" id="capabilities" aria-labelledby="capabilities-heading">
      <div className="mm-container">
        <div className="mm-section-heading">
          <p className="mm-eyebrow">Capabilities</p>
          <h2 id="capabilities-heading">
            We build our own.
            <br />
            We can build yours.
          </h2>
          <p className="mm-section-desc">
            The same disciplines behind MetaMech products are available for customer projects.
          </p>
        </div>

        <div className="capability-grid" style={{ marginTop: '2rem' }}>
          {groups.map((group) => (
            <div
              key={group.id}
              id={group.id}
              className="capability-block"
              style={{ ['--cap-accent' as string]: group.accent }}
            >
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
