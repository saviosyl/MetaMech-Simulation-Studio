import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileOutput, Check, ArrowRight, FolderOpen, Settings, Play, Download,
  Table, Files, ChevronRight, Monitor, HardDrive, FileCode,
  Zap, FolderTree, ShieldCheck, Tag
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import AnimatedToolsContent from '@/components/AnimatedToolsContent';

export const metadata: Metadata = {
  title: 'SolidWorks Batch Export — STEP & DXF Files with Auto Naming',
  description:
    'Batch export SolidWorks files to STEP and DXF formats with custom naming conventions, automatic folder structure, and format validation. Free 3-day trial.',
  openGraph: {
    title: 'SolidWorks Batch Export — STEP & DXF Files with Auto Naming',
    description: 'Batch export SolidWorks files to STEP and DXF with custom naming, auto folder structure, and format validation.',
    url: 'https://metamechsolutions.com/tools/file-export',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/tools/file-export' },
};

const features = [
  'Batch export to STEP, DXF, and other formats',
  'Custom naming conventions with variables',
  'Automatic folder structure creation',
  'Format validation before export',
  'Configuration-specific exports',
  'Revision-based file naming',
  'Selective export by part type or property',
  'Export log and error reporting',
];

const benefits = [
  { title: 'Batch Processing', desc: 'Export hundreds of files with a single click.', icon: Zap },
  { title: 'Smart Naming', desc: 'Automatic file naming based on part properties and revisions.', icon: Tag },
  { title: 'Folder Organization', desc: 'Files are automatically organized into the right directories.', icon: FolderTree },
  { title: 'Quality Checks', desc: 'Built-in validation ensures all exports are correct.', icon: ShieldCheck },
];

const howItWorks = [
  {
    step: '01',
    title: 'Select Files',
    description: 'Open an assembly or pick individual parts. Select which components to export.',
    icon: FolderOpen,
  },
  {
    step: '02',
    title: 'Set Export Options',
    description: 'Choose formats (STEP, DXF, IGES, etc.), naming rules, and output folder structure.',
    icon: Settings,
  },
  {
    step: '03',
    title: 'Run Batch Export',
    description: 'MetaMech processes each file, applying naming and validation rules automatically.',
    icon: Play,
  },
  {
    step: '04',
    title: 'Review & Share',
    description: 'Get organized export folders with a log report. Ready to share with suppliers.',
    icon: Download,
  },
];

const comparisonItems = [
  { aspect: 'Export time (100 files)', before: '30-60 minutes', after: 'Under 2 minutes' },
  { aspect: 'File naming', before: 'Manual rename each file', after: 'Auto-named by rules' },
  { aspect: 'Folder structure', before: 'Manual creation & sorting', after: 'Auto-created per config' },
  { aspect: 'Format errors', before: 'Discovered by supplier', after: 'Caught during validation' },
  { aspect: 'Config-specific export', before: 'Open each config manually', after: 'All configs in one batch' },
];

const techSpecs = {
  supported: ['SolidWorks parts (.SLDPRT)', 'SolidWorks assemblies (.SLDASM)', 'SolidWorks drawings (.SLDDRW)', 'Multi-body & multi-config parts'],
  exportFormats: ['STEP (.stp, .step)', 'DXF (.dxf)', 'IGES (.igs, .iges)', 'Parasolid (.x_t, .x_b)', 'STL (.stl)', 'PDF (.pdf from drawings)'],
  systemReqs: ['Windows 10/11 (64-bit)', 'SolidWorks 2018+', '4 GB RAM minimum (8 GB recommended)', '.NET Framework 4.7.2+'],
};

const faqs = [
  {
    q: 'Which file formats can I export to?',
    a: 'MetaMech supports STEP, DXF, IGES, Parasolid, STL, and PDF exports. You can export multiple formats simultaneously in a single batch run — for example, export STEP for suppliers and DXF for laser cutting in one operation.',
  },
  {
    q: 'How does the custom naming work?',
    a: 'You define naming rules using variables like {PartNumber}, {Description}, {Revision}, {Configuration}, {Material}. For example: "{PartNumber}_Rev{Revision}_{Configuration}.step" would produce "MM-1001_RevC_Default.step".',
  },
  {
    q: 'Can I export specific configurations only?',
    a: 'Yes. You can export all configurations, the active configuration only, or select specific configurations by name. Each configuration can be exported to its own subfolder automatically.',
  },
  {
    q: 'What does the validation check for?',
    a: 'Validation checks include: geometry errors in exported files, missing references, zero-volume bodies, interfering components, and file write errors. A detailed log shows any issues found.',
  },
  {
    q: 'Can I filter which parts get exported?',
    a: 'Absolutely. Filter by part type (machined, sheet metal, purchased), custom properties, material, or any SolidWorks property. You can also exclude specific parts by name or pattern.',
  },
];

const relatedTools = [
  {
    icon: Table,
    title: 'BOM Automation',
    description: 'Generate accurate Bills of Materials with custom templates and one-click export.',
    href: '/tools/bom',
    color: 'cyan' as const,
  },
  {
    icon: Files,
    title: 'PDF Merge + Index',
    description: 'Combine drawings into professional PDF packages with auto-generated index.',
    href: '/tools/pdf-merge',
    color: 'gold' as const,
  },
];

export default function FileExportPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MetaMech STEP / DXF Export',
    applicationCategory: 'EngineeringApplication',
    operatingSystem: 'Windows',
    description: 'Batch export SolidWorks files to STEP and DXF formats.',
    offers: {
      '@type': 'Offer',
      price: '1299',
      priceCurrency: 'EUR',
    },
    creator: { '@type': 'Organization', name: 'MetaMech Solutions' },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://metamechsolutions.com/tools' },
      { '@type': 'ListItem', position: 3, name: 'STEP/DXF Export', item: 'https://metamechsolutions.com/tools/file-export' },
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
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Tools', href: '/tools' }, { name: 'STEP / DXF Export' }]} />

          <AnimatedToolsContent>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6">
                <FileOutput size={32} className="text-cyan-400" />
              </div>
              <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                STEP / DXF <span className="text-gradient-teal">EXPORT</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Export multiple SolidWorks files in batch with consistent naming conventions,
                automatic folder organization, and built-in format validation. Perfect for
                manufacturing handoffs and supplier packages.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link href="/download" className="btn-primary flex items-center gap-2">
                  Start Free Trial <ArrowRight size={18} />
                </Link>
                <Link href="/pricing" className="btn-secondary flex items-center gap-2">
                  View Pricing <ArrowRight size={18} />
                </Link>
              </div>

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
              Batch export with smart naming — organized and validated in seconds.
            </p>
          </div>

          <div className="glass-card p-2 sm:p-3 max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0a2018 40%, #0a1628 70%, #1a1a2e 100%)' }}>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#070b14]/80 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-gray-500 ml-3 font-mono">MetaMech Batch Export — Conveyor_Assembly_v8</span>
              </div>
              <div className="p-6 sm:p-8 min-h-[300px] sm:min-h-[400px] flex flex-col gap-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono">142 Components Found</div>
                  <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">Format: STEP + DXF</div>
                  <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono">Validation: Passed ✓</div>
                </div>
                {/* Fake export progress */}
                <div className="flex-1 space-y-1.5 mt-2 font-mono text-xs">
                  <div className="flex items-center gap-3 text-green-400/80">
                    <Check size={12} /> <span>Exported: MM-2001_RevB_Default.step</span> <span className="text-gray-600 ml-auto">→ /STEP/Machined/</span>
                  </div>
                  <div className="flex items-center gap-3 text-green-400/80">
                    <Check size={12} /> <span>Exported: MM-2001_RevB_Flat.dxf</span> <span className="text-gray-600 ml-auto">→ /DXF/SheetMetal/</span>
                  </div>
                  <div className="flex items-center gap-3 text-green-400/80">
                    <Check size={12} /> <span>Exported: MM-2002_RevA_Default.step</span> <span className="text-gray-600 ml-auto">→ /STEP/Machined/</span>
                  </div>
                  <div className="flex items-center gap-3 text-green-400/80">
                    <Check size={12} /> <span>Exported: MM-2003_RevC_Default.step</span> <span className="text-gray-600 ml-auto">→ /STEP/Purchased/</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyan-400/80">
                    <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> <span>Exporting: MM-2004_RevA_Config2.step...</span>
                  </div>
                  <div className="text-gray-600 mt-2">... 137 of 142 complete</div>
                </div>
                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>96%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              HOW IT <span className="text-gradient-teal">WORKS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              From assembly to organized export folders in four steps.
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
              BEFORE VS <span className="text-gradient-teal">AFTER</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6 border-red-500/20 hover:border-red-500/40 transition-colors">
              <h3 className="font-orbitron text-lg font-bold text-red-400 mb-4">❌ Manual File Export</h3>
              <ul className="space-y-3">
                {comparisonItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-red-400/60 mt-0.5">•</span>
                    <span><strong className="text-gray-400">{item.aspect}:</strong> {item.before}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <h3 className="font-orbitron text-lg font-bold text-cyan-400 mb-4">✅ With MetaMech Batch Export</h3>
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
                <FileCode size={22} className="text-cyan-400" />
                <h3 className="font-orbitron text-sm font-bold text-white">Export Formats</h3>
              </div>
              <ul className="space-y-2">
                {techSpecs.exportFormats.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" /> {item}
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
            READY TO BATCH <span className="text-gradient-teal text-shimmer">EXPORT</span>?
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
