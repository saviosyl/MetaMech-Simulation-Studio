import { brand, productAccents } from '@metamech/brand';

export const products = [
  {
    id: 'mdat',
    name: 'MetaMech MDAT',
    fullName: 'MetaMech Mechanical Design Automation Tools',
    category: 'Mechanical Design Automation',
    description: 'Automate repetitive CAD and mechanical engineering workflows.',
    accent: productAccents.mdat,
    cta: 'Explore MDAT',
    href: '/products/mdat',
    futureUrl: brand.domains.mdatFuture,
    label: 'A MetaMech Solutions Product',
  },
  {
    id: 'simulation',
    name: 'MetaMech Simulation Studio',
    fullName: 'MetaMech Simulation Studio',
    category: 'Interactive 3D Engineering',
    description:
      'Design, configure and visualise industrial systems in an interactive browser-based environment.',
    accent: productAccents.simulation,
    cta: 'Explore Simulation Studio',
    href: '/products/simulation-studio',
    futureUrl: brand.domains.simulationFuture,
    appUrl: brand.domains.simulationApp,
    label: 'A MetaMech Solutions Product',
  },
  {
    id: 'goldmeta',
    name: 'GoldMeta',
    fullName: 'GoldMeta',
    category: 'AI Market Intelligence',
    description:
      'AI-assisted market structure, analysis and trading decision-support technology.',
    accent: productAccents.goldmeta,
    cta: 'Explore GoldMeta',
    href: '/products/goldmeta',
    futureUrl: brand.domains.goldmeta,
    label: 'A MetaMech Solutions Product',
  },
] as const;

export const projectEnquiryOptions = [
  'Custom Software',
  'Web Application',
  'Mobile Application',
  'Website',
  'AI / Automation',
  'Engineering Automation',
  'Interactive 3D',
  'Product Video / Animation',
  'MetaMech Product Support',
  'Other',
] as const;

export const contact = {
  email: brand.email,
  formspree: 'https://formspree.io/f/xvzzkjwd',
} as const;

export const processSteps = [
  { id: '01', title: 'Discover', body: 'Understand the problem, constraints and success criteria.' },
  { id: '02', title: 'Define', body: 'Shape scope, architecture and delivery milestones.' },
  { id: '03', title: 'Design', body: 'Prototype interfaces, workflows and technical approach.' },
  { id: '04', title: 'Build', body: 'Implement reliable software with clear product thinking.' },
  { id: '05', title: 'Test', body: 'Validate usability, edge cases and integration quality.' },
  { id: '06', title: 'Launch', body: 'Ship, support and iterate with measurable outcomes.' },
] as const;

export { brand, productAccents };
