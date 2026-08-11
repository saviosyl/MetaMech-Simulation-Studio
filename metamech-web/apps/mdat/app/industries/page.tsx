import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Stethoscope, Cog, ArrowLeftRight, Cpu, Car, Factory, Zap,
  ShoppingCart, ArrowRight, Check
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import AnimatedIndustriesContent from '@/components/AnimatedIndustriesContent';

export const metadata: Metadata = {
  title: 'Industries — SolidWorks Automation for Medical, Automotive, Robotics & More',
  description:
    'MetaMech SolidWorks automation tools trusted across Medical Devices, Automotive, Robotics, Manufacturing, Food & Beverage, and more. Industry-specific use cases & templates.',
  openGraph: {
    title: 'Industries — SolidWorks Automation for Medical, Automotive, Robotics & More',
    description: 'MetaMech SolidWorks automation tools trusted across Medical Devices, Automotive, Robotics, Food & Beverage, and more.',
    url: 'https://metamechsolutions.com/industries',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/industries' },
};

const industries = [
  { name: 'Medical Devices', icon: Stethoscope },
  { name: 'Automation', icon: Cog },
  { name: 'Conveyors', icon: ArrowLeftRight },
  { name: 'Special Machinery', icon: Cpu },
  { name: 'Robotics', icon: Factory },
  { name: 'Automotive', icon: Car },
  { name: 'Food & Beverage', icon: Factory },
  { name: 'Industrial Equipment', icon: Factory },
  { name: 'Manufacturing', icon: Cog },
  { name: 'Energy', icon: Zap },
  { name: 'Consumer Products', icon: ShoppingCart },
  { name: 'Packaging', icon: ShoppingCart },
];

const detailedIndustries = [
  {
    title: 'Medical Device Engineering',
    icon: Stethoscope,
    description:
      'Precision and compliance for life-critical products. Our automation tools ensure accurate documentation and traceability required for medical device development.',
    useCases: [
      'FDA/MDR-compliant BOM generation with full traceability',
      'Automated drawing packages for regulatory submissions',
      'Revision-controlled STEP exports for contract manufacturers',
      'Standardized templates meeting ISO 13485 documentation requirements',
    ],
    color: 'cyan' as const,
  },
  {
    title: 'Automation & Robotics',
    icon: Cog,
    description:
      'Streamlined design for robotic and automated systems. Reduce design iteration time and improve consistency across complex automation projects.',
    useCases: [
      'Multi-configuration BOMs for modular automation cells',
      'Batch export of 500+ components per machine build',
      'Drawing packages with automatic index for commissioning teams',
      'Library management for reusable actuator and sensor assemblies',
    ],
    color: 'gold' as const,
  },
  {
    title: 'Custom & Special Machinery',
    icon: Factory,
    description:
      'Tailored solutions for specialized equipment. From concept to manufacturing, accelerate your custom machinery design process.',
    useCases: [
      'Project-specific BOM templates with cost tracking columns',
      'Supplier packages with STEP files and drawing PDFs per vendor',
      'Automatic naming by project code, assembly level, and revision',
      'Drawing sets organized by discipline (mechanical, pneumatic, electrical)',
    ],
    color: 'cyan' as const,
  },
  {
    title: 'Conveyor Systems',
    icon: ArrowLeftRight,
    description:
      'Efficient documentation for modular conveyor designs. Handle repetitive component sets with ease and generate accurate material lists.',
    useCases: [
      'Flat BOMs for repeating conveyor sections and modules',
      'Batch DXF export for sheet metal parts and laser-cut profiles',
      'Standardized drawing packages for installation teams',
      'Configuration-specific exports for variable-length conveyors',
    ],
    color: 'gold' as const,
  },
  {
    title: 'Automotive & Motorsport',
    icon: Car,
    description:
      'Meet demanding OEM requirements with automated documentation workflows that ensure consistency and speed across automotive design programs.',
    useCases: [
      'OEM-format BOM templates with PPAP documentation support',
      'STEP exports in customer-specified naming conventions',
      'Multi-configuration management for variant-heavy designs',
      'Automated revision tracking across ECN workflows',
    ],
    color: 'cyan' as const,
  },
  {
    title: 'Food & Beverage Equipment',
    icon: Factory,
    description:
      'Hygienic design documentation for food-grade machinery. Streamline compliance and material traceability for processing and packaging equipment.',
    useCases: [
      'Material-grade BOMs tracking stainless steel specifications',
      'Drawing packages for factory acceptance testing (FAT)',
      'Batch STEP exports for CNC and fabrication vendors',
      'Standardized templates for washdown and clean-in-place assemblies',
    ],
    color: 'gold' as const,
  },
];

export default function IndustriesPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Industries', item: 'https://metamechsolutions.com/industries' },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden pt-[100px]">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Industries' }]} />

          <div className="text-center mb-12">
            <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              TRUSTED ACROSS <span className="text-gradient-teal">INDUSTRIES</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              MetaMech powers engineering teams in diverse sectors worldwide.
            </p>
          </div>

          <AnimatedIndustriesContent>
          {/* Industry Chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {industries.map((industry, index) => (
              <div
                key={index}
                data-animate="chip"
                className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 cursor-default"
              >
                <industry.icon size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium whitespace-nowrap">{industry.name}</span>
              </div>
            ))}
          </div>

          {/* Detailed Industry Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {detailedIndustries.map((industry, index) => (
              <div
                key={index}
                data-animate="feature-card"
                className={`glass-card p-6 group hover:-translate-y-3 transition-all duration-300 card-tilt ${industry.color === 'cyan' ? 'hover:border-cyan-500/30' : 'hover:border-gold/30'}`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 ${industry.color === 'cyan' ? 'bg-cyan-500/20' : 'bg-gold/20'}`}>
                  <industry.icon size={28} className={industry.color === 'cyan' ? 'text-cyan-400' : 'text-gold'} />
                </div>
                <h2 className={`font-orbitron text-lg font-bold text-white mb-3 transition-colors ${industry.color === 'cyan' ? 'group-hover:text-cyan-400' : 'group-hover:text-gold'}`}>
                  {industry.title}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{industry.description}</p>

                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Key Use Cases</h3>
                  <ul className="space-y-2">
                    {industry.useCases.map((useCase, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <Check size={14} className={`mt-0.5 flex-shrink-0 ${industry.color === 'cyan' ? 'text-cyan-400' : 'text-gold'}`} />
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          </AnimatedIndustriesContent>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
            YOUR INDUSTRY, <span className="text-gradient-teal text-shimmer">AUTOMATED</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            No matter your sector, MetaMech adapts to your workflows. Try it free for 3 days.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/download" className="btn-primary flex items-center gap-2">
              Download Free Trial <ArrowRight size={18} />
            </Link>
            <Link href="/contact" className="btn-secondary flex items-center gap-2">
              Talk to an Engineer <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
