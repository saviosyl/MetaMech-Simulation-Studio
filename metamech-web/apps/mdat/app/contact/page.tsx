import type { Metadata } from 'next';
import { Mail, MapPin, Clock, Check } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import ContactForm from '@/components/ContactForm';
import AnimatedContactContent from '@/components/AnimatedContactContent';

export const metadata: Metadata = {
  title: 'Contact MetaMech — Get a Demo | SolidWorks Automation Experts',
  description:
    'Contact MetaMech Solutions for a live demo, support, or custom engineering project. SolidWorks automation experts based in Galway, Ireland. Response within 24 hours.',
  openGraph: {
    title: 'Contact MetaMech — Get a Demo | SolidWorks Automation Experts',
    description: 'Get in touch with MetaMech Solutions. Request a demo or discuss your SolidWorks automation needs.',
    url: 'https://metamechsolutions.com/contact',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/contact' },
};

export default function ContactPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Contact', item: 'https://metamechsolutions.com/contact' },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <section className="relative py-20 lg:py-32 overflow-hidden pt-[100px]">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal/5 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Contact' }]} />

          <div className="text-center mb-16">
            <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              REQUEST A <span className="text-gradient-teal">DEMO</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Ready to transform your engineering workflow? Get in touch with our team.
            </p>
          </div>

          <AnimatedContactContent>
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6">
                <h2 className="font-orbitron text-lg font-bold text-white mb-6">Contact Information</h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Mail size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Email</div>
                      <a href="mailto:hi@metamechsolutions.com" className="text-white hover:text-cyan-400 transition-colors">
                        hi@metamechsolutions.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Location</div>
                      <p className="text-white">Galway, Ireland</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <Clock size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Response Time</div>
                      <p className="text-white">Within 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h2 className="font-orbitron text-lg font-bold text-white mb-4">Why Choose Us</h2>
                <ul className="space-y-3">
                  {['Built by engineers, for engineers', 'Average 10x ROI in first year', 'Dedicated customer support', 'Regular feature updates'].map(
                    (item, index) => (
                      <li key={index} className="flex items-center gap-3 text-sm text-gray-400">
                        <Check size={16} className="text-cyan-400 flex-shrink-0" />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
          </AnimatedContactContent>
        </div>
      </section>
    </>
  );
}
