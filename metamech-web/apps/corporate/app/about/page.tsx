import type { Metadata } from 'next';
import AboutPositioning from '@/components/sections/AboutPositioning';
import FinalCta from '@/components/sections/FinalCta';

export const metadata: Metadata = {
  title: 'About',
  description:
    'MetaMech Solutions — built from engineering, expanded through technology. Product development for software, automation and interactive 3D.',
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="mm-container">
          <p className="mm-eyebrow">About</p>
          <h1>MetaMech Solutions</h1>
          <p>We combine engineering thinking with modern software, automation and digital product development.</p>
        </div>
      </section>
      <AboutPositioning />
      <FinalCta />
    </>
  );
}
