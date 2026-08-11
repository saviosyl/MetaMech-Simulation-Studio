import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'MetaMech Solutions privacy policy — how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-[70px]">
      <Breadcrumbs items={[{ name: 'Privacy Policy' }]} />
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-navy" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-8">Privacy Policy</h1>
          <div className="glass-card p-8 space-y-6 text-gray-400 leading-relaxed">
            <p>Last updated: February 2026</p>
            <h2 className="font-orbitron text-xl text-white">1. Information We Collect</h2>
            <p>When you use MetaMech Solutions, we may collect personal information such as your name, email address, company name, and payment information when you purchase a license or request a trial.</p>
            <h2 className="font-orbitron text-xl text-white">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide and improve our services, process transactions, send you updates about your license, and respond to your inquiries.</p>
            <h2 className="font-orbitron text-xl text-white">3. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information. Payment processing is handled securely through Stripe and Revolut.</p>
            <h2 className="font-orbitron text-xl text-white">4. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:hi@metamechsolutions.com" className="text-cyan-400 hover:text-cyan-300">hi@metamechsolutions.com</a>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
