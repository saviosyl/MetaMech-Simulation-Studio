import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Check, X, Star, ArrowRight, Zap, Shield, Crown, Lock,
  CreditCard, RotateCcw, Download, Quote, Users, Building2,
  Table, Files, FileOutput, Palette, Headphones, GraduationCap,
  Code, Wrench, ChevronRight
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import ROICalculator from '@/components/ROICalculator';
import CheckoutForm from '@/components/CheckoutForm';
import AnimatedPricingContent from '@/components/AnimatedPricingContent';

export const metadata: Metadata = {
  title: 'MetaMech Pricing — SolidWorks Automation from €999/year',
  description:
    'MetaMech Solutions pricing: Free 3-day trial, Standard €999/yr, Premium €1,299/yr, Premium Plus €1,599/yr. Calculate your ROI. Save 85% engineering time.',
  openGraph: {
    title: 'MetaMech Pricing — SolidWorks Automation from €999/year',
    description: 'Flexible pricing for SolidWorks automation tools. Free trial, Standard, Premium, and Premium Plus plans. Calculate your ROI.',
    url: 'https://metamechsolutions.com/pricing',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/pricing' },
};

const plans = [
  {
    name: 'Trial',
    price: 0,
    period: '3 days free',
    description: 'Try before you buy',
    icon: Zap,
    features: ['Full feature access', 'Community support', 'Single user license', 'All automation tools'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Standard',
    price: 999,
    period: 'per year',
    description: 'Perfect for small teams',
    icon: Shield,
    features: ['BOM Automation', 'PDF Merge + Index', 'Email support', 'Single user license', 'Quarterly updates'],
    cta: 'Get Standard',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: 1299,
    period: 'per year',
    description: 'Most popular choice',
    icon: Crown,
    features: [
      'All Standard features',
      'STEP/DXF Export',
      'Priority support',
      'Multi-user discount',
      'Monthly updates',
      'Custom templates',
    ],
    cta: 'Get Premium',
    highlighted: true,
    badge: 'MOST POPULAR',
  },
  {
    name: 'Premium Plus',
    price: 1599,
    period: 'per year',
    description: 'Enterprise solution',
    icon: Star,
    features: [
      'All Premium features',
      'Custom development',
      'Dedicated support',
      'Training sessions',
      'API access',
      'White-label options',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const featureMatrix = [
  { feature: 'BOM Automation', icon: Table, trial: true, standard: true, premium: true, plus: true },
  { feature: 'PDF Merge + Index', icon: Files, trial: true, standard: true, premium: true, plus: true },
  { feature: 'STEP / DXF Export', icon: FileOutput, trial: true, standard: false, premium: true, plus: true },
  { feature: 'Custom Templates', icon: Palette, trial: false, standard: false, premium: true, plus: true },
  { feature: 'Priority Support', icon: Headphones, trial: false, standard: false, premium: true, plus: true },
  { feature: 'Training Sessions', icon: GraduationCap, trial: false, standard: false, premium: false, plus: true },
  { feature: 'API Access', icon: Code, trial: false, standard: false, premium: false, plus: true },
  { feature: 'Custom Development', icon: Wrench, trial: false, standard: false, premium: false, plus: true },
];

const trustBadges = [
  { icon: RotateCcw, label: '3-Day Free Trial' },
  { icon: Lock, label: 'SSL Secure' },
  { icon: Download, label: 'No Card for Trial' },
  { icon: CreditCard, label: 'Cancel Anytime' },
];

const pricingTestimonials = [
  {
    quote: 'At €999/year, MetaMech saves us roughly €50,000 in engineering time annually. The ROI calculation on their site was actually conservative.',
    name: 'VP Engineering',
    role: 'Automation Industry',
  },
  {
    quote: 'We started with Standard, upgraded to Premium within a month. The STEP export alone is worth the difference. Best money we spent on tools this year.',
    name: 'Design Team Lead',
    role: 'Medical Devices',
  },
];

const faqs = [
  {
    q: 'Can I try MetaMech before purchasing?',
    a: 'Yes! We offer a free 3-day trial with full access to all features. No credit card required.',
  },
  {
    q: 'What SolidWorks versions are supported?',
    a: 'MetaMech supports SolidWorks 2018 and later versions on Windows.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Absolutely. You can upgrade or downgrade your plan at any time. We\'ll prorate the difference.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — every plan comes with a free 3-day trial so you can test all features before committing. All sales are final after purchase.',
  },
  {
    q: 'Do you offer volume discounts?',
    a: 'Yes. For teams of 5+ engineers, contact us for custom pricing and multi-user discounts.',
  },
  {
    q: 'How does the multi-user discount work?',
    a: 'Premium plans get 15% off for 3-5 users, 25% off for 6-10 users, and custom pricing for 10+. Contact us for a personalized quote.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards via Stripe, Revolut, and bank transfer via invoice. All payments are processed securely.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'Yes, MetaMech is a Windows application that integrates directly with SolidWorks. The download is approximately 45MB and installs in under 2 minutes.',
  },
];

export default function PricingPage() {
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'MetaMech SolidWorks Automation Tools',
    description: 'SolidWorks automation tools: BOM generation, PDF merge with index, STEP/DXF batch export.',
    brand: {
      '@type': 'Brand',
      name: 'MetaMech Solutions',
    },
    url: 'https://metamechsolutions.com/pricing',
    offers: [
      {
        '@type': 'Offer',
        name: 'Trial',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        description: '3-day free trial with full feature access',
        url: 'https://metamechsolutions.com/download',
      },
      {
        '@type': 'Offer',
        name: 'Standard',
        price: '999',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2026-12-31',
        description: 'BOM Automation + PDF Merge for single user',
        url: 'https://metamechsolutions.com/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Premium',
        price: '1299',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2026-12-31',
        description: 'All tools including STEP/DXF Export, priority support, custom templates',
        url: 'https://metamechsolutions.com/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Premium Plus',
        price: '1599',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2026-12-31',
        description: 'Enterprise solution with custom development, API access, dedicated support',
        url: 'https://metamechsolutions.com/pricing',
      },
    ],
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://metamechsolutions.com/pricing' },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      <AnimatedPricingContent>
      {/* Pricing Cards */}
      <section className="relative py-20 lg:py-32 overflow-hidden pt-[100px]">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-teal/5 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Pricing' }]} />

          <div className="text-center mb-16">
            <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              CHOOSE YOUR <span className="text-gradient-teal">PLAN</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Flexible pricing options to fit teams of any size. All plans include core automation features.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <div key={index} data-animate="plan-card" className={`relative group ${plan.highlighted ? 'lg:-mt-4 lg:mb-4' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1 bg-gradient-to-r from-gold to-amber-500 rounded-full text-xs font-bold text-navy shadow-glow-gold">
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div
                  className={`h-full glass-card p-6 transition-all duration-300 hover:-translate-y-4 ${
                    plan.highlighted
                      ? 'border-cyan-500/50 shadow-glow-teal hover:shadow-glow-teal-lg'
                      : 'hover:border-cyan-500/30 hover:shadow-card-hover'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${
                      plan.highlighted ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white' : 'bg-white/10 text-cyan-400'
                    }`}
                  >
                    <plan.icon size={24} />
                  </div>

                  <h2 className="font-orbitron text-xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">€{plan.price}</span>
                      <span className="text-gray-500 text-sm">/{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2 text-sm text-gray-400">
                        <Check size={16} className={`mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-cyan-400' : 'text-gray-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#checkout"
                    className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                      plan.highlighted
                        ? 'btn-primary'
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-cyan-500/50'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm mb-6">Try free for 3 days — explore every feature before you buy.</p>
            <div className="flex flex-wrap justify-center gap-6">
              {trustBadges.map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-500 text-xs">
                  <badge.icon size={16} className="text-cyan-400" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              COMPARE <span className="text-gradient-teal">FEATURES</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              See exactly what&apos;s included in each plan.
            </p>
          </div>

          <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 border-b border-white/10">
              <div className="p-4 sm:p-5 font-orbitron text-xs font-bold text-gray-400">Feature</div>
              <div className="p-4 sm:p-5 font-orbitron text-xs font-bold text-gray-400 text-center">Trial</div>
              <div className="p-4 sm:p-5 font-orbitron text-xs font-bold text-gray-400 text-center">Standard</div>
              <div className="p-4 sm:p-5 font-orbitron text-xs font-bold text-cyan-400 text-center">Premium</div>
              <div className="p-4 sm:p-5 font-orbitron text-xs font-bold text-gray-400 text-center">Plus</div>
            </div>
            {/* Rows */}
            {featureMatrix.map((row, i) => (
              <div key={i} className={`grid grid-cols-5 border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                <div className="p-4 sm:p-5 flex items-center gap-2">
                  <row.icon size={16} className="text-gray-500 hidden sm:block flex-shrink-0" />
                  <span className="text-sm text-gray-300">{row.feature}</span>
                </div>
                {[row.trial, row.standard, row.premium, row.plus].map((included, j) => (
                  <div key={j} className="p-4 sm:p-5 flex items-center justify-center">
                    {included ? (
                      <Check size={18} className={j === 2 ? 'text-cyan-400' : 'text-green-400/60'} />
                    ) : (
                      <X size={16} className="text-gray-700" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-teal/5 rounded-full blur-[200px] -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px] -translate-y-1/2" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              CALCULATE YOUR <span className="text-gradient-gold">ROI</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              See how much time and money MetaMech can save your engineering team.
            </p>
          </div>
          <div data-animate="roi"><ROICalculator /></div>
        </div>
      </section>

      {/* Pricing Testimonials */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              WORTH EVERY <span className="text-gradient-gold">CENT</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {pricingTestimonials.map((t, i) => (
              <div key={i} className="glass-card p-6 sm:p-8 hover:border-gold/30 transition-colors">
                <Quote size={28} className="text-gold/20 mb-4" />
                <p className="text-gray-400 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center">
                    <Users size={18} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checkout */}
      <section id="checkout" className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal/5 rounded-full blur-[200px]" />
        </div>

        <div className="relative z-10 max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              COMPLETE YOUR <span className="text-gradient-gold">ORDER</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg">
              You&apos;re almost there. Fill in your details to proceed with payment.
            </p>
          </div>
          <div data-animate="checkout"><CheckoutForm /></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              FREQUENTLY ASKED <span className="text-gradient-teal">QUESTIONS</span>
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} data-animate="faq" className="glass-card p-6 hover:border-cyan-500/20 transition-colors">
                <h3 className="font-orbitron text-sm font-bold text-white mb-2 flex items-start gap-2">
                  <ChevronRight size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card p-8 sm:p-12 border-gold/20">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
              <Building2 size={28} className="text-gold" />
            </div>
            <h2 className="font-orbitron text-2xl sm:text-3xl font-bold text-white mb-4">
              ENTERPRISE? <span className="text-gradient-gold">LET&apos;S TALK</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              For teams of 10+ engineers, we offer custom pricing, dedicated onboarding, priority support,
              and tailored automation solutions. Let&apos;s build something that fits your exact workflow.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="btn-primary flex items-center gap-2">
                Contact Sales <ArrowRight size={18} />
              </Link>
              <Link href="/services" className="btn-secondary flex items-center gap-2">
                View Services <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      </AnimatedPricingContent>
    </>
  );
}
