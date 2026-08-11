import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mm: {
          bg: '#F7F9FC',
          surface: '#FFFFFF',
          text: '#10263A',
          muted: '#5F6B78',
          border: '#DCE4EC',
          blue: '#3F7CFF',
          teal: '#20C7C9',
          cyan: '#43D7FF',
          green: '#35C98B',
          warm: '#FFB84A',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px rgba(16, 38, 58, 0.08)',
        panel: '0 10px 40px rgba(63, 124, 255, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
