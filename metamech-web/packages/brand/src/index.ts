export const brandColors = {
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  text: '#10263A',
  textSecondary: '#5F6B78',
  border: '#DCE4EC',
  blue: '#3F7CFF',
  teal: '#20C7C9',
  cyan: '#43D7FF',
  green: '#35C98B',
  warm: '#FFB84A',
} as const;

export const productAccents = {
  mdat: brandColors.blue,
  simulation: brandColors.teal,
  goldmeta: brandColors.text,
  software: brandColors.blue,
  ai: brandColors.teal,
  engineering: brandColors.blue,
  interactive3d: brandColors.cyan,
  web: brandColors.green,
} as const;

/**
 * Future domain intent. GoldMeta public host is left blank until owner
 * confirms a verified destination via NEXT_PUBLIC_GOLDMETA_URL.
 */
export const brand = {
  name: 'MetaMech Solutions',
  tagline: 'Technology & Product Development',
  email: 'hi@metamechsolutions.com',
  domains: {
    corporateFuture: 'https://metamechsolutions.com',
    mdatFuture: 'https://mdat.metamechsolutions.com',
    simulationFuture: 'https://simulation.metamechsolutions.com',
    simulationApp: 'https://metamech-studio.pages.dev',
    goldmeta: '',
  },
} as const;
