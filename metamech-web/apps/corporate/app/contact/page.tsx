import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Start a project with MetaMech Solutions — software, automation, engineering and digital products.',
};

export default function ContactPage() {
  return (
    <section className="page-hero">
      <div className="mm-container" style={{ paddingBottom: '4rem' }}>
        <p className="mm-eyebrow">Contact</p>
        <h1>Start a Project</h1>
        <p>Share the outcome you need. We’ll respond with next steps.</p>
        <div style={{ marginTop: '1.75rem' }}>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
