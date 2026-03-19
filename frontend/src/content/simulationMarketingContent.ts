export const simulationMarketingAssets = {
  hero: '/assets/simulation-tool/sim-hero-main-light-v01.png',
  connectionProof: '/assets/simulation-tool/sim-proof-connection-transfer-light-v01.png',
  flowProof: '/assets/simulation-tool/sim-proof-flow-behavior-light-v01.png',
  reliabilityProof: '/assets/simulation-tool/sim-proof-transfer-reliability-light-v01.png',
  validationProof: '/assets/simulation-tool/sim-proof-validation-process-panel-light-v01.png',
  presentationProof: '/assets/simulation-tool/sim-presentation-export-cinematic-light-v01.png',
  pricingSupport: '/assets/simulation-tool/sim-pricing-trial-fullaccess-light-v01.png',
} as const;

export const simulationHeroCopy = {
  headline: 'Plan, test, and present industrial layouts with confidence.',
  subheadline:
    'MetaMech Studio helps teams shape layouts, test product movement, and communicate outcomes clearly before implementation.',
} as const;

export const simulationBenefits = [
  {
    title: 'Faster engineering decisions',
    body: 'Move from concept to clear, evidence-backed direction without fragmented tools.',
  },
  {
    title: 'Earlier flow insight',
    body: 'See how products travel through connected equipment before physical changes begin.',
  },
  {
    title: 'Stronger stakeholder communication',
    body: 'Use polished visuals and playback to align engineering, operations, and customers.',
  },
  {
    title: 'Reduced late-stage rework',
    body: 'Find transfer and connection issues sooner, when fixes are faster and less costly.',
  },
] as const;

export const simulationHowItWorks = [
  { title: 'Build', body: 'Create or refine your layout with practical industrial components.' },
  { title: 'Connect', body: 'Define node-to-node flow between conveyors, machines, and process points.' },
  { title: 'Simulate', body: 'Run scenarios to verify behavior and identify flow problems early.' },
  { title: 'Present', body: 'Share clear, presentation-ready views for technical and business stakeholders.' },
] as const;

export const simulationPersonas = [
  'Process and layout engineers',
  'System integrators',
  'Technical pre-sales teams',
  'Manufacturing teams evaluating line changes',
] as const;

export const simulationUseCases = [
  'New line concept validation',
  'Transfer and handoff behavior checks',
  'Customer-facing solution walkthroughs',
  'Internal review and decision support',
] as const;

export const simulationFaq = [
  {
    q: 'What is MetaMech Studio used for?',
    a: 'MetaMech Studio is used to design industrial layouts, validate flow behavior through simulation, and present clear decision-ready outputs before implementation.',
  },
  {
    q: 'Who is MetaMech Studio for?',
    a: 'It is designed for process/layout engineers, system integrators, and teams that need faster validation and better stakeholder communication.',
  },
  {
    q: 'What is included in the 1-Day Trial?',
    a: 'The 1-Day Trial includes full Simulation Tool access so you can evaluate your workflow using real scenarios.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'Trial access ends automatically. You can continue with Full Access on monthly or yearly billing.',
  },
  {
    q: 'What does Full Access include?',
    a: 'Full Access includes ongoing use of MetaMech Studio for layout creation, simulation validation, and presentation workflows.',
  },
  {
    q: 'What is the difference between monthly and yearly Full Access?',
    a: 'Both include the same Full Access capabilities. Monthly is flexible; yearly is recommended for continuous use.',
  },
  {
    q: 'Can we use customer-specific scenarios or models?',
    a: 'Yes. Customer-specific scenarios and project configurations can be used as part of your simulation workflow.',
  },
  {
    q: 'Is onboarding or support available?',
    a: 'Yes. Onboarding and support guidance are available to help your team start quickly and operate effectively.',
  },
] as const;

export const simulationCtas = {
  startTrial: 'Start 1-Day Trial',
  bookDemo: 'Book Demo',
  contactSales: 'Contact Sales',
  getFullAccess: 'Get Full Access',
} as const;

export const simulationUrls = {
  productHome: 'https://app.metamechsolutions.com/simulation',
} as const;

export const simulationStripeLinks = {
  yearly: {
    url: 'https://buy.stripe.com/9B6eVcbm3fKN4At06U2Nq03',
    label: 'MetaMech Simulation – Yearly',
  },
  monthly: {
    url: 'https://buy.stripe.com/bJe4gy61J4254Atg5S2Nq02',
    label: 'MetaMech Simulation – Monthly',
  },
} as const;
