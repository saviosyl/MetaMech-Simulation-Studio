import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ParticleBackground from '@/components/ParticleBackground';

const BASE_URL = 'https://metamechsolutions.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'MetaMech Solutions — SolidWorks Automation Tools | BOM, PDF Merge, Export',
    template: '%s | MetaMech Solutions',
  },
  description:
    'Save 85% of your engineering time with MetaMech SolidWorks automation tools. Automate BOMs, merge PDFs, batch export STEP/DXF files. Free 3-day trial. Built for SolidWorks 2018+.',
  keywords: [
    'SolidWorks automation',
    'SolidWorks BOM automation',
    'SolidWorks PDF merge',
    'SolidWorks batch export',
    'SolidWorks macros',
    'SolidWorks VBA macros',
    'CAD automation tools',
    'engineering automation software',
    'SolidWorks add-in',
    'SolidWorks plugin',
    'automate SolidWorks bill of materials',
    'merge SolidWorks drawings to PDF',
    'batch export STEP files SolidWorks',
    'SolidWorks automation tool for engineers',
    'SolidWorks productivity tools',
    'reduce SolidWorks manual work',
    'SolidWorks workflow automation',
    'SolidWorks drawing automation',
    'SolidWorks file management tool',
    'SolidWorks time saving tools',
    'mechanical design consultant',
    'mechanical design services Ireland',
    'SolidWorks design services',
    'CAD design services',
    'SolidWorks consultant Ireland',
    'mechanical engineering automation',
    'MetaMech',
    'MetaMech Solutions',
    'metamechsolutions',
    'engineering document automation',
    'SolidWorks drawing management',
    'SolidWorks template automation',
    'STEP file export automation',
    'DXF batch export SolidWorks',
  ],
  authors: [{ name: 'MetaMech Solutions' }],
  creator: 'MetaMech Solutions',
  publisher: 'MetaMech Solutions',
  category: 'Engineering Software',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'MetaMech Solutions',
    title: 'MetaMech Solutions — SolidWorks Automation Tools | BOM, PDF Merge, Export',
    description:
      'Save 85% of your engineering time with MetaMech SolidWorks automation tools. Automate BOMs, merge PDFs, batch export STEP/DXF files. Free 3-day trial.',
    images: [{ url: `${BASE_URL}/metamech-logo.png`, width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetaMech Solutions — SolidWorks Automation Tools | BOM, PDF Merge, Export',
    description:
      'Save 85% of your engineering time with MetaMech SolidWorks automation tools. Automate BOMs, merge PDFs, batch export STEP/DXF files. Free 3-day trial.',
    images: [`${BASE_URL}/metamech-logo.png`],
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: '/metamech-logo.png',
    apple: '/metamech-logo.png',
  },
  other: {
    'google-site-verification': 'REPLACE_WITH_YOUR_GOOGLE_VERIFICATION_CODE',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-954RBCT27V"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-954RBCT27V');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-navy text-white overflow-x-hidden">
        <ParticleBackground />
        <Navigation />
        <main className="relative z-[1]">{children}</main>
        <Footer />
        {/* Hide website nav/footer on simulation studio pages */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (window.location.pathname.startsWith('/simulation-studio/editor') || window.location.pathname.startsWith('/simulation-studio/dashboard')) {
              var style = document.createElement('style');
              style.textContent = 'nav, footer, [class*="ParticleBackground"], .particle-bg { display: none !important; } body { background: #1e1e2e !important; } main { padding: 0 !important; margin: 0 !important; }';
              document.head.appendChild(style);
            }
          })();
        `}} />
      </body>
    </html>
  );
}
