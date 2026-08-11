import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Table, Check, ArrowRight, Upload, Settings, Play, FileSpreadsheet,
  Files, FileOutput, ChevronDown, ChevronRight, Monitor, Cpu, HardDrive,
  Clock, Target, RefreshCw, Layers
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import AnimatedToolsContent from '@/components/AnimatedToolsContent';

export const metadata: Metadata = {
  title: 'SolidWorks BOM Automation — Generate Bills of Materials in Seconds',
  description:
    'Automate SolidWorks Bill of Materials generation in 30 seconds. Custom Excel templates, automatic part numbering, multi-configuration support. Free 3-day trial.',
  openGraph: {
    title: 'SolidWorks BOM Automation — Generate Bills of Materials in Seconds',
    description: 'Automate SolidWorks BOM generation in 30 seconds. Custom Excel templates, automatic part numbering, multi-config support.',
    url: 'https://metamechsolutions.com/tools/bom',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/tools/bom' },
};

const features = [
  'Custom Excel templates for consistent BOM formats',
  'Automatic part number sequencing across assemblies',
  'Multi-configuration support for complex designs',
  'Real-time updates as assemblies change',
  'Export to Excel with one click',
  'Configurable column mapping and filtering',
  'Sub-assembly rollup and flattening options',
  'Integration with company ERP and PLM systems',
];

const benefits = [
  { title: 'Save 4+ Hours Per Week', desc: 'Eliminate manual BOM creation and data entry errors.', icon: Clock },
  { title: '99.9% Accuracy', desc: 'Automated extraction ensures no parts are missed or duplicated.', icon: Target },
  { title: 'Custom Templates', desc: 'Match your company\'s exact BOM format and standards.', icon: Layers },
  { title: 'Multi-Config Ready', desc: 'Handle complex assemblies with multiple configurations effortlessly.', icon: RefreshCw },
];

const howItWorks = [
  {
    step: '01',
    title: 'Open Your Assembly',
    description: 'Open any SolidWorks assembly — from simple parts to 1000+ component assemblies.',
    icon: Upload,
  },
  {
    step: '02',
    title: 'Choose Your Template',
    description: 'Select from pre-built templates or create custom Excel layouts matching your company standards.',
    icon: Settings,
  },
  {
    step: '03',
    title: 'Run BOM Extraction',
    description: 'One click extracts all component data, quantities, properties, and custom fields.',
    icon: Play,
  },
  {
    step: '04',
    title: 'Export to Excel',
    description: 'Get a perfectly formatted BOM in Excel, ready to share with purchasing, manufacturing, or your ERP.',
    icon: FileSpreadsheet,
  },
];

const comparisonItems = [
  { aspect: 'Time per BOM', before: '2-4 hours', after: 'Under 30 seconds' },
  { aspect: 'Error rate', before: '5-15% parts missed', after: '< 0.1% with validation' },
  { aspect: 'Template consistency', before: 'Varies by engineer', after: '100% consistent' },
  { aspect: 'Revision updates', before: 'Manual re-creation', after: 'Auto-refresh' },
  { aspect: 'Multi-config BOMs', before: 'Separate manual BOMs', after: 'One-click all configs' },
];

const techSpecs = {
  supported: ['SolidWorks 2018 and newer', 'Assembly files (.SLDASM)', 'Part files (.SLDPRT)', 'Multi-body parts'],
  exportFormats: ['Microsoft Excel (.xlsx, .xls)', 'CSV (.csv)', 'PDF table format', 'Custom delimited text'],
  systemReqs: ['Windows 10/11 (64-bit)', 'SolidWorks 2018+', '4 GB RAM minimum (8 GB recommended)', '.NET Framework 4.7.2+'],
};

const faqs = [
  {
    q: 'Can I use my company\'s existing BOM template?',
    a: 'Yes. MetaMech supports fully custom Excel templates. Map any SolidWorks property to any column in your template — part numbers, descriptions, materials, custom properties, and more.',
  },
  {
    q: 'Does it handle sub-assemblies and multi-level BOMs?',
    a: 'Absolutely. You can generate flat (single-level) BOMs, indented (multi-level) BOMs, or top-level-only BOMs. Sub-assembly rollup and flattening options are fully configurable.',
  },
  {
    q: 'What happens when I update the assembly?',
    a: 'Simply re-run the BOM extraction. MetaMech reads the live assembly data each time, so your BOM always reflects the latest design state.',
  },
  {
    q: 'Can it extract custom properties from parts?',
    a: 'Yes. MetaMech can extract any standard or custom SolidWorks property — material, weight, vendor, cost, revision, description, and any custom fields you\'ve defined.',
  },
  {
    q: 'Is there a limit on assembly size?',
    a: 'No hard limit. MetaMech has been tested on assemblies with 5000+ components. Processing time scales linearly and typically remains under 60 seconds for even the largest assemblies.',
  },
];

const relatedTools = [
  {
    icon: Files,
    title: 'PDF Merge + Index',
    description: 'Combine drawings into professional PDF packages with auto-generated index.',
    href: '/tools/pdf-merge',
    color: 'gold' as const,
  },
  {
    icon: FileOutput,
    title: 'STEP / DXF Export',
    description: 'Batch export to STEP, DXF, and more with smart naming and folder structure.',
    href: '/tools/file-export',
    color: 'cyan' as const,
  },
];

export default function BOMPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MetaMech BOM Automation',
    applicationCategory: 'EngineeringApplication',
    operatingSystem: 'Windows',
    description: 'Automate SolidWorks Bill of Materials generation with custom templates.',
    offers: {
      '@type': 'Offer',
      price: '999',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    creator: {
      '@type': 'Organization',
      name: 'MetaMech Solutions',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://metamechsolutions.com/tools' },
      { '@type': 'ListItem', position: 3, name: 'BOM Automation', item: 'https://metamechsolutions.com/tools/bom' },
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
      <JsonLd data={softwareSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden pt-[100px]">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Tools', href: '/tools' }, { name: 'BOM Automation' }]} />

          <AnimatedToolsContent>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Content */}
            <div>
              <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6">
                <Table size={32} className="text-cyan-400" />
              </div>
              <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                BOM <span className="text-gradient-teal">AUTOMATION</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Generate accurate Bills of Materials with custom templates and automatic formatting.
                Eliminate manual data entry, reduce errors, and save hours every week with our
                powerful BOM extraction and export tools.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link href="/download" className="btn-primary flex items-center gap-2">
                  Start Free Trial <ArrowRight size={18} />
                </Link>
                <Link href="/pricing" className="btn-secondary flex items-center gap-2">
                  View Pricing <ArrowRight size={18} />
                </Link>
              </div>

              {/* Benefits */}
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((b, i) => (
                  <div key={i} data-animate="benefit" className="glass-card p-5 group hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <b.icon size={16} className="text-cyan-400" />
                      <h3 className="font-orbitron text-sm font-bold text-cyan-400">{b.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Feature List */}
            <div className="glass-card p-8">
              <h2 className="font-orbitron text-xl font-bold text-white mb-6">
                Features & <span className="text-gradient-teal">Capabilities</span>
              </h2>
              <ul className="space-y-4">
                {features.map((feature, i) => (
                  <li key={i} data-animate="feature" className="flex items-start gap-3 text-gray-400 group">
                    <Check size={18} className="text-cyan-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="group-hover:text-gray-300 transition-colors">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-white/10">
                <Link href="/contact" className="w-full btn-primary flex items-center justify-center gap-2">
                  Request a Demo <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
          </AnimatedToolsContent>
        </div>
      </section>

      {/* Screenshot / Mockup Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              SEE IT IN <span className="text-gradient-teal">ACTION</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              A clean, intuitive interface that integrates directly into your SolidWorks workflow.
            </p>
          </div>

          <div className="glass-card p-2 sm:p-3 max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2847 40%, #0a1628 70%, #1a1a2e 100%)' }}>
              {/* Fake title bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#070b14]/80 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-gray-500 ml-3 font-mono">MetaMech BOM Automation — Assembly_Main_v12.SLDASM</span>
              </div>
              {/* Fake UI content */}
              <div className="p-6 sm:p-8 min-h-[300px] sm:min-h-[400px] flex flex-col gap-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono">Assembly Loaded ✓</div>
                  <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">Components: 347</div>
                  <div className="px-4 py-2 rounded-lg bg-gold/10 border border-gold/20 text-gold text-xs font-mono">Template: Company_BOM_v3.xlsx</div>
                </div>
                <div className="flex-1 grid grid-cols-6 gap-px bg-white/5 rounded-lg overflow-hidden mt-2">
                  {/* Header row */}
                  <div className="bg-cyan-500/10 p-2 text-[10px] sm:text-xs font-mono text-cyan-400 font-bold">Item #</div>
                  <div className="bg-cyan-500/10 p-2 text-[10px] sm:text-xs font-mono text-cyan-400 font-bold">Part Number</div>
                  <div className="bg-cyan-500/10 p-2 text-[10px] sm:text-xs font-mono text-cyan-400 font-bold">Description</div>
                  <div className="bg-cyan-500/10 p-2 text-[10px] sm:text-xs font-mono text-cyan-400 font-bold">Material</div>
                  <div className="bg-cyan-500/10 p-2 text-[10px] sm:text-xs font-mono text-cyan-400 font-bold">Qty</div>
                  <div className="bg-cyan-500/10 p-2 text-[10px] sm:text-xs font-mono text-cyan-400 font-bold">Weight</div>
                  {/* Data rows */}
                  {[
                    ['001', 'MM-1001-A', 'Base Frame', 'SS 304', '1', '24.5 kg'],
                    ['002', 'MM-1002-B', 'Drive Shaft', 'EN8', '2', '3.2 kg'],
                    ['003', 'MM-1003-C', 'Bracket Assy', 'AL 6061', '4', '0.8 kg'],
                    ['004', 'MM-1004-A', 'Cover Plate', 'SS 316', '2', '1.1 kg'],
                    ['005', 'MM-1005-D', 'Motor Mount', 'EN24', '1', '5.7 kg'],
                  ].map((row, i) => (
                    <>{row.map((cell, j) => (
                      <div key={`${i}-${j}`} className={`p-2 text-[10px] sm:text-xs font-mono ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${j === 0 ? 'text-cyan-400/70' : 'text-gray-400'}`}>
                        {cell}
                      </div>
                    ))}</>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 font-mono">Extracted 347 items in 1.2s</span>
                  <div className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono cursor-default">Export to Excel →</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              HOW IT <span className="text-gradient-teal">WORKS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              From assembly to formatted BOM in four simple steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative group">
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[calc(100%-20%)] h-[2px] bg-gradient-to-r from-cyan-500/40 to-cyan-500/10" />
                )}
                <div className="glass-card p-6 text-center hover:-translate-y-2 transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all duration-300">
                    <step.icon size={24} className="text-cyan-400" />
                  </div>
                  <div className="font-orbitron text-3xl font-bold text-cyan-500/30 mb-2">{step.step}</div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              BEFORE VS <span className="text-gradient-gold">AFTER</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="glass-card p-6 border-red-500/20 hover:border-red-500/40 transition-colors">
              <h3 className="font-orbitron text-lg font-bold text-red-400 mb-4">❌ Manual BOM Creation</h3>
              <ul className="space-y-3">
                {comparisonItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-red-400/60 mt-0.5">•</span>
                    <span><strong className="text-gray-400">{item.aspect}:</strong> {item.before}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* After */}
            <div className="glass-card p-6 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <h3 className="font-orbitron text-lg font-bold text-cyan-400 mb-4">✅ With MetaMech BOM Automation</h3>
              <ul className="space-y-3">
                {comparisonItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-gray-300">{item.aspect}:</strong> {item.after}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              TECHNICAL <span className="text-gradient-teal">SPECIFICATIONS</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Monitor size={22} className="text-cyan-400" />
                <h3 className="font-orbitron text-sm font-bold text-white">Supported Inputs</h3>
              </div>
              <ul className="space-y-2">
                {techSpecs.supported.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileSpreadsheet size={22} className="text-gold" />
                <h3 className="font-orbitron text-sm font-bold text-white">Export Formats</h3>
              </div>
              <ul className="space-y-2">
                {techSpecs.exportFormats.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-gold flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <HardDrive size={22} className="text-cyan-400" />
                <h3 className="font-orbitron text-sm font-bold text-white">System Requirements</h3>
              </div>
              <ul className="space-y-2">
                {techSpecs.systemReqs.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              FREQUENTLY ASKED <span className="text-gradient-teal">QUESTIONS</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card p-6 hover:border-cyan-500/20 transition-colors">
                <h3 className="font-orbitron text-sm font-bold text-white mb-3 flex items-start gap-2">
                  <ChevronRight size={18} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Tools */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-12">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              RELATED <span className="text-gradient-gold">TOOLS</span>
            </h2>
            <p className="text-gray-400 text-sm">Complete your automation suite with these complementary tools.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {relatedTools.map((tool, i) => (
              <Link
                key={i}
                href={tool.href}
                className="group glass-card p-6 flex items-start gap-4 hover:-translate-y-2 transition-all duration-300 hover:border-cyan-500/30"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tool.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gold/20 text-gold'}`}>
                  <tool.icon size={24} />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{tool.title}</h3>
                  <p className="text-gray-400 text-sm">{tool.description}</p>
                </div>
                <ArrowRight size={18} className="text-gray-500 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
            READY TO AUTOMATE YOUR <span className="text-gradient-teal text-shimmer">BOMS</span>?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Start your free 3-day trial today. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/download" className="btn-primary flex items-center gap-2">
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <Link href="/pricing" className="btn-secondary flex items-center gap-2">
              View Pricing <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
