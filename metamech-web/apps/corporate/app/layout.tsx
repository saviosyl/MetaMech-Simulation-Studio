import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

/**
 * Prepared corporate metadata for future metamechsolutions.com.
 * Do NOT publish new production canonicals until domain migration is approved.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://metamechsolutions.com'),
  title: {
    default: 'MetaMech Solutions — Technology & Product Development',
    template: '%s | MetaMech Solutions',
  },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/metamech-logo.png', type: 'image/png' }],
  },
  description:
    'MetaMech Solutions designs and develops intelligent software, engineering automation, interactive 3D and digital products — including MetaMech MDAT, Simulation Studio and GoldMeta.',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    siteName: 'MetaMech Solutions',
    title: 'MetaMech Solutions — Technology & Product Development',
    description:
      'Technology and product development across software, AI & automation, engineering automation, interactive 3D and web experiences.',
    images: [{ url: '/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetaMech Solutions — Technology & Product Development',
    description:
      'Technology and product development across software, AI & automation, engineering automation, interactive 3D and web experiences.',
    images: ['/metamech-logo.png'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className={manrope.className}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
