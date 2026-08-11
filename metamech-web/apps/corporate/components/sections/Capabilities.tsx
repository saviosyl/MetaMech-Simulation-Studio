const homeGroups = [
  {
    id: 'software-apps',
    title: 'Software & Apps',
    accent: '#3F7CFF',
    items: [
      'Custom Software',
      'Web Applications',
      'Mobile / Cross-platform Apps',
      'SaaS Platforms',
      'Internal Business Tools',
      'Dashboards & Portals',
    ],
  },
  {
    id: 'ai-automation',
    title: 'AI & Automation',
    accent: '#20C7C9',
    items: [
      'AI Integrations',
      'AI Assistants',
      'Workflow Automation',
      'Document Processing',
      'Intelligent Search',
      'Decision-Support Systems',
    ],
  },
  {
    id: 'engineering-3d',
    title: 'Engineering & 3D',
    accent: '#43D7FF',
    items: [
      'CAD / SolidWorks Automation',
      'Engineering Applications',
      'Engineering Utilities',
      'Interactive 3D',
      'Industrial Visualisation',
      'Product Configurators',
    ],
  },
  {
    id: 'web-creative',
    title: 'Web & Creative',
    accent: '#35C98B',
    items: [
      'Premium Websites',
      'Product Websites',
      'Digital Product Launches',
      'AI-assisted Product Videos',
      'Technical Explainers',
      'Product Visualisation',
    ],
  },
];

const fullGroups = [
  {
    id: 'software-apps',
    title: 'Software & Apps',
    accent: '#3F7CFF',
    items: [
      'Custom Software',
      'Web Applications',
      'Mobile / Cross-platform Apps',
      'SaaS Platforms',
      'Internal Business Tools',
      'Dashboards & Portals',
      'API Integrations',
      'Database-driven Applications',
    ],
  },
  {
    id: 'ai-automation',
    title: 'AI & Automation',
    accent: '#20C7C9',
    items: [
      'AI Integrations',
      'AI Assistants',
      'Workflow Automation',
      'Document Processing',
      'Intelligent Search',
      'Decision-Support Systems',
      'Reporting Automation',
      'Practical AI Product Features',
    ],
  },
  {
    id: 'engineering-3d',
    title: 'Engineering & 3D',
    accent: '#43D7FF',
    items: [
      'CAD / SolidWorks Automation',
      'Engineering Applications',
      'Engineering Utilities',
      'Interactive 3D',
      'Industrial Visualisation',
      'Product Configurators',
      'Technical Simulation Interfaces',
      'Browser-based Engineering Tools',
    ],
  },
  {
    id: 'web-creative',
    title: 'Web & Creative',
    accent: '#35C98B',
    items: [
      'Premium Websites',
      'Product Websites',
      'Digital Product Launches',
      'AI-assisted Product Videos',
      'Technical Explainers',
      'Product Visualisation',
      'UI / UX Implementation',
      'Launch Landing Experiences',
    ],
  },
];

export default function Capabilities({ variant = 'home' }: { variant?: 'home' | 'full' }) {
  const groups = variant === 'full' ? fullGroups : homeGroups;

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
