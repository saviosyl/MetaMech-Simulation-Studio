import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Settings, DraftingCompass, Library, Check, ArrowRight,
  Search, Pencil, Wrench, HeadphonesIcon, Stethoscope, Cog, Factory,
  FileOutput, BarChart3, Table
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import AnimatedServicesContent from '@/components/AnimatedServicesContent';

export const metadata: Metadata = {
  title: 'Engineering Services — SolidWorks Design & CAD Automation | MetaMech',
  description:
    'Professional mechanical design, CAD automation, and SolidWorks library services. From concept to production — comprehensive engineering support from MetaMech Solutions.',
  openGraph: {
    title: 'Engineering Services — SolidWorks Design & CAD Automation | MetaMech',
    description: 'Professional mechanical design, CAD automation, and SolidWorks library services from MetaMech Solutions.',
    url: 'https://metamechsolutions.com/services',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/services' },
};

const services = [
  {
    icon: Settings,
    title: 'Mechanical Design & Engineering',
    description:
      'From concept to production, our engineering team provides comprehensive mechanical design services tailored to your specific requirements.',
    features: [
      'Concept development',
      '3D modeling and simulation',
      'Design optimization',
      'Prototype support',
    ],
  },
  {
    icon: DraftingCompass,
    title: 'CAD / Layout / Manufacturing',
    description:
      'Professional CAD services ensuring your designs are production-ready with accurate documentation and manufacturing specifications.',
    features: [
      'Detailed technical drawings',
      'Manufacturing documentation',
      'Assembly instructions',
      'GD&T implementation',
    ],
  },
  {
    icon: Library,
    title: 'Libraries & Standards',
    description:
      'Build and maintain standardized SolidWorks libraries that ensure consistency and efficiency across your engineering team.',
    features: [
      'Custom SolidWorks libraries',
      'Company standard templates',
      'Design automation setup',
      'Training and documentation',
    ],
  },
];

const processSteps = [
  {
    number: '01',
    title: 'Discovery',
    description: 'We analyze your current workflows, pain points, and goals. Deep-dive into your engineering processes to understand exactly what you need.',
    icon: Search,
    color: 'cyan' as const,
  },
  {
    number: '02',
    title: 'Design',
    description: 'Our engineers create detailed proposals, system architectures, and prototypes. You review and approve before any implementation begins.',
    icon: Pencil,
    color: 'gold' as const,
  },
  {
    number: '03',
    title: 'Implementation',
    description: 'We build, test, and deploy your custom solutions — libraries, templates, automation workflows — with rigorous quality checks.',
    icon: Wrench,
    color: 'cyan' as const,
  },
  {
    number: '04',
    title: 'Support',
    description: 'Ongoing support, training, and iteration. We ensure your team is fully equipped and your solution evolves with your needs.',
    icon: HeadphonesIcon,
    color: 'gold' as const,
  },
];

const caseStudies = [
  {
    title: 'Medical Device Manufacturer',
    industry: 'Medical Devices',
    icon: Stethoscope,
    challenge: 'Manual BOM creation taking 6+ hours per assembly with frequent errors causing production delays.',
    solution: 'Custom BOM automation with FDA-compliant templates and traceability tracking.',
    results: ['85% reduction in BOM creation time', 'Zero errors in 12 months', 'Full regulatory traceability'],
    color: 'cyan' as const,
  },
  {
    title: 'Automation Systems Integrator',
    industry: 'Automation',
    icon: Cog,
    challenge: 'Drawing packages requiring 2-3 days to compile per project, delaying customer deliverables.',
    solution: 'PDF merge with auto-index and custom cover pages. Integrated with project numbering system.',
    results: ['Drawing packages in 5 minutes', '40+ hours saved per month', 'Professional, consistent output'],
    color: 'gold' as const,
  },
  {
    title: 'Custom Machinery Builder',
    industry: 'Special Machinery',
    icon: Factory,
    challenge: 'Exporting 200+ files per machine for suppliers. Manual export prone to missed files and wrong naming.',
    solution: 'Batch STEP/DXF export with automatic naming, folder structure, and validation.',
    results: ['Export time: 45 min → 3 min', 'Zero missed files since deployment', 'Suppliers receive consistent packages'],
    color: 'cyan' as const,
  },
];

export default function ServicesPage() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Engineering Services',
    provider: {
      '@type': 'Organization',
      name: 'MetaMech Solutions',
      url: 'https://metamechsolutions.com',
    },
    areaServed: 'Worldwide',
    description: 'Professional mechanical design, CAD services, and SolidWorks library management.',
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://metamechsolutions.com/services' },
    ],
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* Hero + Services Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden pt-[100px]">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-teal/5 rounded-full blur-[200px] -translate-y-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Services' }]} />

          <div className="text-center mb-16">
            <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              ENGINEERING <span className="text-gradient-gold">SERVICES</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Beyond automation tools, we offer comprehensive engineering support to transform your design workflow.
            </p>
          </div>

          <AnimatedServicesContent>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8" style={{ perspective: '800px' }}>
            {services.map((service, index) => (
              <div
                key={index}
                className="group glass-card p-6 sm:p-8 transition-all duration-300 hover:-translate-y-3 hover:border-cyan-500/30 hover:shadow-card-hover card-tilt"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <service.icon size={32} className="text-cyan-400" />
                </div>

                <h2 className="font-orbitron text-xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                  {service.title}
                </h2>

                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{service.description}</p>

                <ul className="space-y-2 mb-8">
                  {service.features.map((feature, fIndex) => (
                    <li
                      key={fIndex}
                      className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-gray-400 transition-colors"
                    >
                      <Check size={14} className="text-cyan-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className="w-full py-3 rounded-xl border border-cyan-500/50 text-cyan-400 font-medium flex items-center justify-center gap-2 hover:bg-cyan-500 hover:text-navy transition-all duration-300"
                >
                  Enquire Now <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
          </AnimatedServicesContent>
        </div>
      </section>

      {/* Our Process Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              OUR <span className="text-gradient-gold">PROCESS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              A proven four-step approach that delivers results, every time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="relative group">
                {index < processSteps.length - 1 && (
                  <div className={`hidden lg:block absolute top-14 left-[60%] w-[calc(100%-20%)] h-[2px] bg-gradient-to-r ${step.color === 'cyan' ? 'from-cyan-500/40 to-gold/20' : 'from-gold/40 to-cyan-500/20'}`} />
                )}
                <div className="glass-card p-6 text-center hover:-translate-y-2 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 ${step.color === 'cyan' ? 'bg-cyan-500/20 group-hover:bg-cyan-500/30' : 'bg-gold/20 group-hover:bg-gold/30'}`}>
                    <step.icon size={24} className={step.color === 'cyan' ? 'text-cyan-400' : 'text-gold'} />
                  </div>
                  <div className={`font-orbitron text-3xl font-bold mb-2 ${step.color === 'cyan' ? 'text-cyan-500/30' : 'text-gold/30'}`}>{step.number}</div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              CASE <span className="text-gradient-teal">STUDIES</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Real projects, real results. See how we&apos;ve helped engineering teams.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {caseStudies.map((study, index) => (
              <div
                key={index}
                className={`glass-card p-6 sm:p-8 group hover:-translate-y-2 transition-all duration-300 ${study.color === 'cyan' ? 'hover:border-cyan-500/30' : 'hover:border-gold/30'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${study.color === 'cyan' ? 'bg-cyan-500/20' : 'bg-gold/20'}`}>
                    <study.icon size={20} className={study.color === 'cyan' ? 'text-cyan-400' : 'text-gold'} />
                  </div>
                  <div>
                    <h3 className="font-orbitron text-sm font-bold text-white">{study.title}</h3>
                    <p className={`text-xs ${study.color === 'cyan' ? 'text-cyan-400/60' : 'text-gold/60'}`}>{study.industry}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Challenge</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{study.challenge}</p>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Solution</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{study.solution}</p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Results</h4>
                  <ul className="space-y-1.5">
                    {study.results.map((result, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check size={14} className={study.color === 'cyan' ? 'text-cyan-400' : 'text-gold'} />
                        <span className={study.color === 'cyan' ? 'text-cyan-400/80' : 'text-gold/80'}>{result}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Automation Tools Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              OUR AUTOMATION <span className="text-gradient-teal">TOOLS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Complement our engineering services with powerful SolidWorks automation tools.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <Link href="/tools/bom" className="glass-card p-6 group hover:-translate-y-2 transition-all duration-300 hover:border-cyan-500/30 block">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Table size={24} className="text-cyan-400" />
              </div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">BOM Automation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Generate accurate Bills of Materials in 30 seconds with custom Excel templates.</p>
              <span className="flex items-center gap-2 text-cyan-400 text-sm font-medium mt-4 group-hover:gap-3 transition-all">Learn More <ArrowRight size={14} /></span>
            </Link>

            <Link href="/tools/pdf-merge" className="glass-card p-6 group hover:-translate-y-2 transition-all duration-300 hover:border-gold/30 block">
              <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileOutput size={24} className="text-gold" />
              </div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-2 group-hover:text-gold transition-colors">PDF Merge + Index</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Combine multiple drawings into a single PDF with automatic index and bookmarks.</p>
              <span className="flex items-center gap-2 text-gold text-sm font-medium mt-4 group-hover:gap-3 transition-all">Learn More <ArrowRight size={14} /></span>
            </Link>

            <Link href="/tools/file-export" className="glass-card p-6 group hover:-translate-y-2 transition-all duration-300 hover:border-cyan-500/30 block">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 size={24} className="text-cyan-400" />
              </div>
              <h3 className="font-orbitron text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">STEP / DXF Export</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Batch export files with consistent naming and automatic folder organization.</p>
              <span className="flex items-center gap-2 text-cyan-400 text-sm font-medium mt-4 group-hover:gap-3 transition-all">Learn More <ArrowRight size={14} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
            LET&apos;S BUILD SOMETHING <span className="text-gradient-gold text-shimmer">TOGETHER</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Tell us about your project. We&apos;ll show you how we can help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-primary flex items-center gap-2">
              Get in Touch <ArrowRight size={18} />
            </Link>
            <Link href="/tools" className="btn-secondary flex items-center gap-2">
              Explore Tools <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
