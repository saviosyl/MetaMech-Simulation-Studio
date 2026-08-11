import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GoldMeta — A MetaMech Solutions Product',
  description:
    'GoldMeta is AI market intelligence technology developed by MetaMech Solutions. No performance or profit claims.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
