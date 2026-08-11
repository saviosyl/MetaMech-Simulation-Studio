import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Files, Check, ArrowRight, FolderOpen, Settings, Play, FileText,
  Table, FileOutput, ChevronRight, Monitor, HardDrive, BookOpen,
  Clock, Bookmark, FileStack, ListOrdered
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import AnimatedToolsContent from '@/components/AnimatedToolsContent';

export const metadata: Metadata = {
  title: 'SolidWorks PDF Merge — Combine Drawings with Auto Index & Bookmarks',
  description:
    'Merge SolidWorks drawings into a single PDF with automatic index generation, clickable bookmarks, and custom page numbering. One-click PDF merge tool. Free trial.',
  openGraph: {
    title: 'SolidWorks PDF Merge — Combine Drawings with Auto Index & Bookmarks',
    description: 'Merge SolidWorks drawings into a single PDF with automatic index, clickable bookmarks, and custom page numbering.',
    url: 'https://metamechsolutions.com/tools/pdf-merge',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/tools/pdf-merge' },
};

const features = [
  'Batch PDF merging from multiple SolidWorks drawings',
  'Automatic index creation with part details',
  'Clickable bookmarks for fast navigation',
  'Custom page numbering and headers',
  'Drawing revision tracking in merged output',
  'Configurable sort order and grouping',
  'Cover page generation with project details',
  'Export to single or multi-file PDF packages',
];

const benefits = [
  { title: 'One-Click Package', desc: 'Merge entire drawing sets into professional PDF packages instantly.', icon: FileStack },
  { title: 'Auto-Generated Index', desc: 'Never manually create drawing indexes again.', icon: ListOrdered },
  { title: 'Smart Bookmarks', desc: 'Navigate large drawing packages with clickable bookmarks.', icon: Bookmark },
  { title: 'Revision Tracking', desc: 'Track drawing revisions automatically in merged output.', icon: Clock },
];

const howItWorks = [
  {
    step: '01',
    title: 'Select Drawings',
    description: 'Choose a folder or pick individual SolidWorks drawing files for your package.',
    icon: FolderOpen,
  },
  {
    step: '02',
    title: 'Configure Package',
    description: 'Set sort order, page numbering, cover page details, and index format.',
    icon: Settings,
  },
  {
    step: '03',
    title: 'Generate Package',
    description: 'MetaMech converts, merges, and indexes all drawings automatically.',
    icon: Play,
  },
  {
    step: '04',
    title: 'Share PDF',
    description: 'Get a professional PDF with index, bookmarks, and page numbers — ready to send.',
    icon: FileText,
  },
];

const comparisonItems = [
  { aspect: 'Package creation', before: '1-2 hours per set', after: 'Under 60 seconds' },
  { aspect: 'Index creation', before: 'Manual spreadsheet entry', after: 'Auto-generated with hyperlinks' },
  { aspect: 'Page numbering', before: 'Add individually in Acrobat', after: 'Automatic, customizable' },
  { aspect: 'Bookmarks', before: 'Manual bookmark creation', after: 'Auto-bookmarked by drawing' },
  { aspect: 'Revision updates', before: 'Rebuild entire package', after: 'Refresh with one click' },
];

const techSpecs = {
  supported: ['SolidWorks drawings (.SLDDRW)', 'Existing PDF files', 'Mixed drawing + PDF sources', 'Multi-sheet drawings'],
  exportFormats: ['Single merged PDF', 'PDF/A compliant output', 'Cover page + index + drawings', 'Multi-file split packages'],
  systemReqs: ['Windows 10/11 (64-bit)', 'SolidWorks 2018+', '4 GB RAM minimum (8 GB recommended)', '.NET Framework 4.7.2+'],
};

const faqs = [
  {
    q: 'Can I merge both SolidWorks drawings and existing PDFs?',
    a: 'Yes. MetaMech can combine SolidWorks drawing files (.SLDDRW) and existing PDF files into a single package. The tool converts drawings on-the-fly and merges everything in the order you specify.',
  },
  {
    q: 'How does the automatic index work?',
    a: 'The index is generated from drawing properties — part number, description, revision, sheet count. It creates a clickable table of contents at the front of your PDF with hyperlinks to each drawing.',
  },
  {
    q: 'Can I customize the cover page?',
    a: 'Absolutely. The cover page is fully customizable — add your company logo, project name, revision info, date, and any other fields. You can save cover page templates for reuse.',
  },
  {
    q: 'What about multi-sheet drawings?',
    a: 'Multi-sheet drawings are fully supported. Each sheet is included in the merged output, and bookmarks are created for each sheet within a drawing. The index reflects sheet counts.',
  },
  {
    q: 'Can I control the sort order?',
    a: 'Yes. Sort by part number, description, file name, or custom property. You can also manually reorder drawings in the queue before merging.',
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
    icon: FileOutput,
    title: 'STEP / DXF Export',
    description: 'Batch export to STEP, DXF, and more with smart naming and folder structure.',
    href: '/tools/file-export',
    color: 'cyan' as const,
  },
];

export default function PDFMergePage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MetaMech PDF Merge + Index',
    applicationCategory: 'EngineeringApplication',
    operatingSystem: 'Windows',
    description: 'Merge SolidWorks drawings into a single PDF with automatic index generation.',
    offers: {
      '@type': 'Offer',
      price: '999',
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
      { '@type': 'ListItem', position: 3, name: 'PDF Merge', item: 'https://metamechsolutions.com/tools/pdf-merge' },
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
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-teal/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Tools', href: '/tools' }, { name: 'PDF Merge + Index' }]} />

          <AnimatedToolsContent>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-16 h-16 rounded-xl bg-gold/20 flex items-center justify-center mb-6">
                <Files size={32} className="text-gold" />
              </div>
              <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                PDF MERGE + <span className="text-gradient-gold">INDEX</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Combine multiple SolidWorks drawings into a single, professionally formatted PDF with
                automatic index generation, clickable bookmarks, and custom page numbering. Create
                complete drawing packages in seconds.
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
                      <b.icon size={16} className="text-gold" />
                      <h3 className="font-orbitron text-sm font-bold text-gold">{b.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8">
              <h2 className="font-orbitron text-xl font-bold text-white mb-6">
                Features & <span className="text-gradient-gold">Capabilities</span>
              </h2>
              <ul className="space-y-4">
                {features.map((feature, i) => (
                  <li key={i} data-animate="feature" className="flex items-start gap-3 text-gray-400 group">
                    <Check size={18} className="text-gold mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
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
              SEE IT IN <span className="text-gradient-gold">ACTION</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Create professional drawing packages with a clean, intuitive interface.
            </p>
          </div>

          <div className="glass-card p-2 sm:p-3 max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a1020 40%, #0a1628 70%, #1a1a2e 100%)' }}>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#070b14]/80 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-gray-500 ml-3 font-mono">MetaMech PDF Merge — Project_Hydra_DrawingSet</span>
              </div>
              <div className="p-6 sm:p-8 min-h-[300px] sm:min-h-[400px] flex flex-col gap-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-xs font-mono">24 Drawings Loaded</div>
                  <div className="px-4 py-2 rounded-lg bg-gold/10 border border-gold/20 text-gold-light text-xs font-mono">Index: Auto-Generated ✓</div>
                  <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">Bookmarks: ON</div>
                </div>
                {/* Fake file list */}
                <div className="flex-1 space-y-1 mt-2">
                  {[
                    { name: 'INDEX — Table of Contents', pages: 'pp. 1-2', status: 'Generated' },
                    { name: 'DRW-001 Base Frame Assembly', pages: 'pp. 3-5', status: 'Rev C' },
                    { name: 'DRW-002 Drive System Layout', pages: 'pp. 6-7', status: 'Rev B' },
                    { name: 'DRW-003 Bracket Sub-Assembly', pages: 'pp. 8-9', status: 'Rev A' },
                    { name: 'DRW-004 Cover Plate Details', pages: 'pp. 10-11', status: 'Rev D' },
                    { name: 'DRW-005 Motor Mount Weldment', pages: 'pp. 12-13', status: 'Rev B' },
                  ].map((file, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${i === 0 ? 'bg-gold/10 border border-gold/20' : 'bg-white/[0.02] border border-white/5'} hover:bg-white/[0.04] transition-colors`}>
                      <div className="flex items-center gap-3">
                        <BookOpen size={14} className={i === 0 ? 'text-gold' : 'text-gray-500'} />
                        <span className={`text-xs font-mono ${i === 0 ? 'text-gold' : 'text-gray-400'}`}>{file.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 font-mono">{file.pages}</span>
                        <span className={`text-xs font-mono ${i === 0 ? 'text-gold' : 'text-cyan-400/60'}`}>{file.status}</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-600 font-mono py-2">... +18 more drawings</div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 font-mono">Total: 52 pages • 24 drawings • 8.4 MB</span>
                  <div className="px-4 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold text-xs font-mono cursor-default">Merge & Export PDF →</div>
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
              HOW IT <span className="text-gradient-gold">WORKS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              From scattered drawings to a professional PDF package in four steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative group">
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[calc(100%-20%)] h-[2px] bg-gradient-to-r from-gold/40 to-gold/10" />
                )}
                <div className="glass-card p-6 text-center hover:-translate-y-2 transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-gold/30 transition-all duration-300">
                    <step.icon size={24} className="text-gold" />
                  </div>
                  <div className="font-orbitron text-3xl font-bold text-gold/30 mb-2">{step.step}</div>
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
            <div className="glass-card p-6 border-red-500/20 hover:border-red-500/40 transition-colors">
              <h3 className="font-orbitron text-lg font-bold text-red-400 mb-4">❌ Manual PDF Packaging</h3>
              <ul className="space-y-3">
                {comparisonItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-red-400/60 mt-0.5">•</span>
                    <span><strong className="text-gray-400">{item.aspect}:</strong> {item.before}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6 border-gold/20 hover:border-gold/40 transition-colors">
              <h3 className="font-orbitron text-lg font-bold text-gold mb-4">✅ With MetaMech PDF Merge</h3>
              <ul className="space-y-3">
                {comparisonItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check size={16} className="text-gold mt-0.5 flex-shrink-0" />
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
              TECHNICAL <span className="text-gradient-gold">SPECIFICATIONS</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Monitor size={22} className="text-gold" />
                <h3 className="font-orbitron text-sm font-bold text-white">Supported Inputs</h3>
              </div>
              <ul className="space-y-2">
                {techSpecs.supported.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-gold flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText size={22} className="text-gold" />
                <h3 className="font-orbitron text-sm font-bold text-white">Output Options</h3>
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
                <HardDrive size={22} className="text-gold" />
                <h3 className="font-orbitron text-sm font-bold text-white">System Requirements</h3>
              </div>
              <ul className="space-y-2">
                {techSpecs.systemReqs.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={14} className="text-gold flex-shrink-0" /> {item}
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
              FREQUENTLY ASKED <span className="text-gradient-gold">QUESTIONS</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card p-6 hover:border-gold/20 transition-colors">
                <h3 className="font-orbitron text-sm font-bold text-white mb-3 flex items-start gap-2">
                  <ChevronRight size={18} className="text-gold mt-0.5 flex-shrink-0" />
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
              RELATED <span className="text-gradient-teal">TOOLS</span>
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
            READY TO STREAMLINE YOUR <span className="text-gradient-gold text-shimmer">DRAWING PACKAGES</span>?
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
