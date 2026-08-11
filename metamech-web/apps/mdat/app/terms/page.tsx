import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MetaMech Solutions terms of service — terms and conditions for using our SolidWorks automation tools.',
};

export default function TermsPage() {
  return (
    <div className="pt-[70px]">
      <Breadcrumbs items={[{ name: 'Terms of Service' }]} />
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-navy" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-8">Terms of Service</h1>
          <div className="glass-card p-8 space-y-6 text-gray-400 leading-relaxed">
            <p>Last updated: February 2026</p>
            <h2 className="font-orbitron text-xl text-white">1. License Agreement</h2>
            <p>By purchasing or downloading MetaMech software, you agree to the terms of our license agreement. Licenses are per-user and non-transferable unless otherwise specified.</p>
            <h2 className="font-orbitron text-xl text-white">2. Trial Period</h2>
            <p>The 3-day free trial provides full access to all features. After the trial period, a paid license is required for continued use.</p>
            <h2 className="font-orbitron text-xl text-white">3. Refund Policy</h2>
            <p>All sales are final. We encourage you to take advantage of the free 3-day trial to evaluate the software before purchasing. If you experience a technical issue that prevents the software from functioning, please contact us at <a href="mailto:hi@metamechsolutions.com" className="text-cyan-400 hover:text-cyan-300">hi@metamechsolutions.com</a> and we will work to resolve it.</p>
            <h2 className="font-orbitron text-xl text-white">4. Limitation of Liability</h2>
            <p>MetaMech Solutions provides tools on an &quot;as is&quot; basis. We are not liable for any damages arising from the use of our software.</p>
            <h2 className="font-orbitron text-xl text-white">5. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:hi@metamechsolutions.com" className="text-cyan-400 hover:text-cyan-300">hi@metamechsolutions.com</a>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
