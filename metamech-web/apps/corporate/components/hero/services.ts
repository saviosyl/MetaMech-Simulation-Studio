export type HeroService = {
  id: string;
  index: string;
  label: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  accent: string;
  visual: 'software' | 'ai' | 'engineering' | 'interactive3d' | 'web';
  image?: string;
};

export const heroServices: HeroService[] = [
  {
    id: 'software',
    index: '01',
    label: 'Software & Applications',
    title: 'We build ideas into technology.',
    description:
      'We design and develop intelligent software, engineering tools, automation, interactive 3D and digital experiences built around real problems.',
    primaryCta: { label: 'Explore Our Products', href: '/#products' },
    secondaryCta: { label: 'Start a Project', href: '/contact/' },
    accent: '#3F7CFF',
    visual: 'software',
  },
  {
    id: 'ai',
    index: '02',
    label: 'AI & Automation',
    title: 'Make repetitive work intelligent.',
    description:
      'AI-powered applications, workflow automation, intelligent assistants, document and data workflows, decision-support tools and practical AI integrations.',
    primaryCta: { label: 'Explore AI Services', href: '/services/#ai-automation' },
    secondaryCta: { label: 'Start a Project', href: '/contact/' },
    accent: '#20C7C9',
    visual: 'ai',
  },
  {
    id: 'engineering',
    index: '03',
    label: 'Engineering Automation',
    title: 'Engineering workflows, automated.',
    description:
      'CAD automation, SolidWorks workflows, drawing automation, BOM, STEP, DXF, engineering utilities and custom engineering software.',
    primaryCta: { label: 'Explore MDAT', href: '/products/mdat/' },
    secondaryCta: { label: 'Start a Project', href: '/contact/' },
    accent: '#3F7CFF',
    visual: 'engineering',
  },
  {
    id: 'interactive3d',
    index: '04',
    label: 'Interactive 3D',
    title: 'Turn complex systems into interactive experiences.',
    description:
      'Browser-based 3D, industrial visualisation, equipment configuration, factory layouts, technical demonstrations and interactive simulation.',
    primaryCta: { label: 'Explore Simulation Studio', href: '/products/simulation-studio/' },
    secondaryCta: { label: 'Start a Project', href: '/contact/' },
    accent: '#43D7FF',
    visual: 'interactive3d',
    image: '/sim-hero-main-light-v01.png',
  },
  {
    id: 'web',
    index: '05',
    label: 'Web & Creative',
    title: 'Digital experiences built to be remembered.',
    description:
      'Premium websites, product websites, interactive web, product launches, AI-assisted videos, brand content and technical explainers.',
    primaryCta: { label: 'View Capabilities', href: '/services/#web-creative' },
    secondaryCta: { label: 'Start a Project', href: '/contact/' },
    accent: '#35C98B',
    visual: 'web',
  },
];
