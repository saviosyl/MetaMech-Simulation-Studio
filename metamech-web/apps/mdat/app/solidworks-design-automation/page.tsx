import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Check, ArrowRight, Download, Zap, FileText, FileOutput, Hash, Settings,
  Users, Briefcase, Building, Shield, Factory, Wrench, Clock, TrendingUp,
  DollarSign, Target
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'SolidWorks Design Automation — The Complete Platform | MetaMech',
  description:
    'Automate SolidWorks BOM generation, PDF exports, STEP/DXF conversion, drawing renumbering and property sync with MetaMech — the complete design automation tool for mechanical engineers.',
  openGraph: {
    title: 'SolidWorks Design Automation — The Complete Platform | MetaMech',
    description:
      'Automate SolidWorks BOM generation, PDF exports, STEP/DXF conversion, drawing renumbering and property sync with MetaMech — the complete design automation tool for mechanical engineers.',
    url: 'https://metamechsolutions.com/solidworks-design-automation',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/solidworks-design-automation' },
};

export default function SolidWorksDesignAutomationPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'SolidWorks Design Automation', item: 'https://metamechsolutions.com/solidworks-design-automation' },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is SolidWorks design automation?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SolidWorks design automation is the use of software tools to automate repetitive tasks in the SolidWorks design workflow — including BOM generation, file export, drawing management, and property synchronisation. It reduces manual effort, eliminates errors, and speeds up design releases.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is MetaMech a SolidWorks add-in or a standalone application?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MetaMech is a standalone Windows desktop application built in VB.NET. It connects to SolidWorks via its API but runs as a separate program. You don\'t need to modify your SolidWorks installation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need programming skills to use MetaMech?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. MetaMech is designed for mechanical engineers, not programmers. Every feature has a graphical interface. There\'s no VBA, no scripting, and no configuration files to edit.',
        },
      },
      {
        '@type': 'Question',
        name: 'What versions of SolidWorks does MetaMech support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MetaMech supports current and recent versions of SolidWorks. Contact us for specific version compatibility.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can MetaMech handle large assemblies?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. MetaMech is designed to process assemblies with hundreds of parts. BOM extraction, batch export, and property sync all work at scale.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does MetaMech work with SolidWorks PDM?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MetaMech operates on local files. It\'s designed for engineers working directly with SolidWorks files on their workstation, whether or not those files are managed by PDM.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is MetaMech different from SolidWorks Task Scheduler?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SolidWorks Task Scheduler handles basic batch operations like file conversion. MetaMech goes further with BOM generation, PDF merge and indexing, drawing renumbering, and template-driven property sync — tasks that Task Scheduler can\'t perform.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Download the free trial and test every feature with your own SolidWorks files. No credit card required.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does a licence cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Visit our pricing page or contact us for current pricing information.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I use MetaMech across my team?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. MetaMech is designed to be deployed across design teams. Each engineer installs it on their workstation and uses the same templates and settings for consistent output.',
        },
      },
    ],
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'MetaMech',
    description: 'The complete SolidWorks design automation platform for BOM generation, PDF exports, STEP/DXF conversion, drawing renumbering and property sync.',
    brand: {
      '@type': 'Organization',
      name: 'MetaMech Solutions',
    },
    url: 'https://metamechsolutions.com/solidworks-design-automation',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      url: 'https://metamechsolutions.com/pricing',
      price: '0',
      priceCurrency: 'EUR',
      priceValidUntil: '2026-12-31',
      description: 'Free 3-day trial. See pricing page for licence options.',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '47',
      bestRating: '5',
    },
    review: {
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: '5',
        bestRating: '5',
      },
      author: {
        '@type': 'Person',
        name: 'Senior Design Engineer',
      },
      reviewBody: 'MetaMech paid for itself in the first week. Our BOM creation went from hours to seconds, and the accuracy is flawless.',
    },
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How MetaMech Works',
    description: 'Get started with MetaMech SolidWorks design automation in four simple steps.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Install',
        text: 'Download MetaMech and install it on any Windows workstation running SolidWorks. Installation takes under two minutes.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Open Your Assembly',
        text: 'Launch MetaMech alongside SolidWorks. Point it at your assembly, drawing, or folder of files.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Choose Your Operation',
        text: 'Select what you need — BOM export, PDF merge, STEP/DXF batch export, drawing renumbering, or property sync. Configure your options (output format, naming rules, template).',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Run',
        text: 'Press the button. MetaMech processes your files, handles edge cases, and delivers clean output. What used to take an hour takes minutes.',
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={productSchema} />
      <JsonLd data={howToSchema} />

      <main className="min-h-screen bg-[#0a1628] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumbs items={[{ name: 'SolidWorks Design Automation' }]} />

          {/* Hero */}
          <div className="mb-12">
            <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              SolidWorks Design Automation — The Complete <span className="text-teal-400">Platform</span>
            </h1>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Every mechanical engineer knows the feeling: the design is done, but the real work is just beginning. Exporting files. Building BOMs. Merging PDFs. Renumbering drawings. Syncing properties. These tasks aren&apos;t engineering — they&apos;re administration. And they consume a staggering amount of engineering time.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              <strong className="text-white">SolidWorks design automation</strong> eliminates that overhead. It takes the repetitive, manual processes that surround every design release and turns them into fast, reliable, one-click operations.
            </p>
            <p className="text-gray-300 mb-0 leading-relaxed">
              MetaMech is a <strong className="text-white">design automation tool</strong> built specifically for SolidWorks. It&apos;s a desktop application that automates the five most time-consuming tasks in every SolidWorks workflow — without macros, without scripting, and without changing how you work.
            </p>
          </div>

          {/* What Is SolidWorks Design Automation? */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              What Is SolidWorks Design Automation?
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              SolidWorks design automation is the practice of using software to perform repetitive SolidWorks tasks automatically. Instead of manually clicking through menus, opening files one by one, and copying data between applications, a <strong className="text-white">design automation tool</strong> handles those operations in batch.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Design automation in SolidWorks can range from simple macro scripts to full enterprise platforms. The spectrum looks like this:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="bg-[#0a1628]">
                    <th className="text-left p-3 font-orbitron text-white">Level</th>
                    <th className="text-left p-3 font-orbitron text-white">Examples</th>
                    <th className="text-left p-3 font-orbitron text-white">Complexity</th>
                    <th className="text-left p-3 font-orbitron text-white">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="p-3 font-bold text-white">Manual</td><td className="p-3">Click, save, copy-paste</td><td className="p-3">None</td><td className="p-3">Free (but expensive in time)</td></tr>
                  <tr><td className="p-3 font-bold text-white">VBA Macros</td><td className="p-3">Custom scripts in SolidWorks</td><td className="p-3">High (requires programming)</td><td className="p-3">Free (but expensive to maintain)</td></tr>
                  <tr><td className="p-3 font-bold text-white">Focused Tools</td><td className="p-3">MetaMech</td><td className="p-3">Low (install and use)</td><td className="p-3">Affordable</td></tr>
                  <tr><td className="p-3 font-bold text-white">Enterprise Platforms</td><td className="p-3">DriveWorks, SOLIDWORKS Manage</td><td className="p-3">Very high (IT project)</td><td className="p-3">€€€€</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 mb-0 leading-relaxed">
              MetaMech sits in the sweet spot: powerful <strong className="text-white">SolidWorks automation</strong> without the complexity or cost of enterprise systems, and without the fragility of homegrown macros.
            </p>
          </div>

          {/* Who Needs SolidWorks Design Automation? */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Who Needs SolidWorks Design Automation?
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              If any of these describe your workflow, you need a design automation tool:
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Wrench size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Mechanical Design Engineers</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">You design parts and assemblies in SolidWorks, then spend hours preparing documentation — BOMs, PDFs, export files. Design automation gives you those hours back.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Users size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Design Team Leads</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">You need consistent outputs across your team. Different engineers format BOMs differently, use different naming conventions, and miss different properties. SolidWorks automation enforces consistency.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Contract Engineers &amp; Consultants</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">You work across multiple clients, each with different documentation standards. A design automation tool lets you switch between templates and output formats without rebuilding your process.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Building size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Small to Mid-Size Manufacturers</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">You don&apos;t have a dedicated automation team or a six-figure PLM budget. You need SolidWorks design automation that works out of the box.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Companies in Regulated Industries</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Medical devices, aerospace, automotive — if your outputs need to be repeatable and auditable, manual processes are a liability. Automation makes every export consistent.</p>
                </div>
              </div>
            </div>
          </div>

          {/* How MetaMech Works */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              How MetaMech Works
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              MetaMech is a Windows desktop application that connects directly to SolidWorks via its API. There&apos;s no cloud component, no server to configure, and no database to manage.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-orbitron font-bold text-teal-400">1</span>
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Install</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Download MetaMech and install it on any Windows workstation running SolidWorks. Installation takes under two minutes.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-orbitron font-bold text-teal-400">2</span>
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Open Your Assembly</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Launch MetaMech alongside SolidWorks. Point it at your assembly, drawing, or folder of files.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-orbitron font-bold text-teal-400">3</span>
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Choose Your Operation</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Select what you need — BOM export, PDF merge, STEP/DXF batch export, drawing renumbering, or property sync. Configure your options (output format, naming rules, template).</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-orbitron font-bold text-teal-400">4</span>
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Run</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Press the button. MetaMech processes your files, handles edge cases, and delivers clean output. What used to take an hour takes minutes.</p>
                </div>
              </div>
            </div>

            <p className="text-gray-300 mt-6 mb-0 leading-relaxed">
              No coding. No macros. No training course. Every feature is designed so that any SolidWorks user can be productive on day one.
            </p>
          </div>

          {/* MetaMech Features */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-6 mt-0">
              MetaMech Features — Complete SolidWorks Automation
            </h2>

            {/* BOM Generation */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <FileText size={24} className="text-teal-400" />
                <h3 className="font-orbitron text-xl font-bold text-white">BOM Generation</h3>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Automatically extract a structured bill of materials from any SolidWorks assembly.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Multi-level or flat BOM extraction</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Custom column mapping (part number, description, material, quantity, weight)</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Export to Excel with formatting preserved</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Handles configurations and virtual components</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Consistent output across every engineer on your team</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">
                <strong className="text-white">Why it matters:</strong> Manually building a BOM from a 500-part assembly is tedious and error-prone. MetaMech&apos;s <strong className="text-white">SolidWorks automation</strong> extracts it in seconds with zero copy-paste errors.
              </p>
              <Link href="/features#bom" className="text-teal-400 hover:text-teal-300 text-sm font-medium">→ Learn more about BOM generation</Link>
            </div>

            {/* PDF Merge & Index */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <FileOutput size={24} className="text-teal-400" />
                <h3 className="font-orbitron text-xl font-bold text-white">PDF Merge &amp; Index</h3>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Batch-export SolidWorks drawings to PDF, merge them into a single document, and generate a clickable table of contents.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Export selected drawings or an entire folder</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Merge into a single PDF with bookmarks</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Auto-generate an index page with drawing numbers and titles</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Control page order and naming</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Ideal for documentation packages and transmittals</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">
                <strong className="text-white">Why it matters:</strong> Clients and manufacturing partners expect a single, indexed PDF package — not 50 individual files. This design automation tool delivers that in one operation.
              </p>
              <Link href="/features#pdf" className="text-teal-400 hover:text-teal-300 text-sm font-medium">→ Learn more about PDF merge</Link>
            </div>

            {/* STEP & DXF Batch Export */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Zap size={24} className="text-teal-400" />
                <h3 className="font-orbitron text-xl font-bold text-white">STEP &amp; DXF Batch Export</h3>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Convert entire assemblies to STEP and DXF format with full control over file naming and folder structure.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Batch export parts and sub-assemblies to STEP</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Batch export flat patterns to DXF for laser/waterjet/plasma cutting</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Custom file naming rules (part number, revision, description)</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Automatic folder creation and organisation</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Overwrite protection and logging</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">
                <strong className="text-white">Why it matters:</strong> Manufacturing needs STEP files for machining and DXF files for cutting. Exporting them one by one is the definition of wasted engineering time. MetaMech&apos;s <strong className="text-white">SolidWorks design automation</strong> handles entire assemblies at once.
              </p>
              <Link href="/features#export" className="text-teal-400 hover:text-teal-300 text-sm font-medium">→ Learn more about batch export</Link>
            </div>

            {/* Drawing Renumbering */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Hash size={24} className="text-teal-400" />
                <h3 className="font-orbitron text-xl font-bold text-white">Drawing Renumbering</h3>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Renumber drawing sheets, views, and balloons in bulk after engineering changes.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Renumber sheets sequentially or by custom rules</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Update balloon references automatically</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Maintain drawing-to-part linkages</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Process multiple drawings in a batch</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Eliminate the most error-prone manual task in SolidWorks</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">
                <strong className="text-white">Why it matters:</strong> After an ECO, renumbering drawings manually is slow and dangerous — one missed reference means a manufacturing error. This is one of the hardest tasks to automate with macros, and one of the easiest with MetaMech.
              </p>
              <Link href="/features#renumber" className="text-teal-400 hover:text-teal-300 text-sm font-medium">→ Learn more about drawing renumbering</Link>
            </div>

            {/* Template & Properties Sync */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Settings size={24} className="text-teal-400" />
                <h3 className="font-orbitron text-xl font-bold text-white">Template &amp; Properties Sync</h3>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Push property templates across hundreds of SolidWorks files to keep metadata consistent.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Define property templates (part number format, description, material, revision)</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Apply templates to individual files, folders, or entire assemblies</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Fill in missing properties and correct inconsistencies</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Sync title block fields automatically</li>
                <li className="flex items-start gap-2 text-gray-300 text-sm"><Check size={14} className="text-teal-400 mt-1 flex-shrink-0" />Audit properties before release</li>
              </ul>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">
                <strong className="text-white">Why it matters:</strong> Inconsistent properties cause downstream problems — wrong part numbers on BOMs, missing descriptions in PDM, incorrect title blocks on drawings. SolidWorks automation through MetaMech keeps everything aligned.
              </p>
              <Link href="/features#properties" className="text-teal-400 hover:text-teal-300 text-sm font-medium">→ Learn more about property sync</Link>
            </div>
          </div>

          {/* Design Automation by Industry */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-6 mt-0">
              SolidWorks Design Automation by Industry
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Factory size={18} className="text-teal-400" />
                  <h3 className="font-orbitron text-lg font-bold text-white">Manufacturing &amp; Fabrication</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Batch-export DXF files for CNC, laser, and waterjet cutting. Generate BOMs that map directly to your ERP system. Produce indexed PDF packages for the shop floor.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-teal-400" />
                  <h3 className="font-orbitron text-lg font-bold text-white">Medical Devices</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Maintain consistent, auditable documentation. Sync properties for DHF compliance. Ensure every drawing revision is numbered correctly and every BOM is accurate.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-teal-400" />
                  <h3 className="font-orbitron text-lg font-bold text-white">Aerospace &amp; Defence</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Handle large assemblies with hundreds of parts. Export STEP files for supply chain partners. Generate traceable documentation packages with merged, indexed PDFs.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-teal-400" />
                  <h3 className="font-orbitron text-lg font-bold text-white">Consumer Products</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Move faster from design to production. Automate the file preparation that slows down every design release. Keep product data consistent across revisions.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={18} className="text-teal-400" />
                  <h3 className="font-orbitron text-lg font-bold text-white">Contract Engineering</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Switch between client standards quickly. Use templates to match different property schemas, naming conventions, and output formats without rebuilding your workflow.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building size={18} className="text-teal-400" />
                  <h3 className="font-orbitron text-lg font-bold text-white">Architecture &amp; Construction</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">Automate documentation for HVAC, piping, and structural components designed in SolidWorks. Export BOMs and drawings in formats your project managers expect.</p>
              </div>
            </div>
          </div>

          {/* The ROI of SolidWorks Design Automation */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              The ROI of SolidWorks Design Automation
            </h2>

            <h3 className="font-orbitron text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-teal-400" /> Time Saved
            </h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              The average mechanical engineer spends <strong className="text-white">8–12 hours per week</strong> on file management, documentation, and data entry — tasks that SolidWorks design automation can reduce to under 2 hours.
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="bg-[#0a1628]">
                    <th className="text-left p-3 font-orbitron text-white">Task</th>
                    <th className="text-left p-3 font-orbitron text-white">Manual Time (per week)</th>
                    <th className="text-left p-3 font-orbitron text-white">With MetaMech</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="p-3">BOM generation &amp; formatting</td><td className="p-3">2–3 hours</td><td className="p-3 text-teal-400">15 min</td></tr>
                  <tr><td className="p-3">PDF export, merge &amp; indexing</td><td className="p-3">2–3 hours</td><td className="p-3 text-teal-400">20 min</td></tr>
                  <tr><td className="p-3">STEP/DXF batch export</td><td className="p-3">1–2 hours</td><td className="p-3 text-teal-400">10 min</td></tr>
                  <tr><td className="p-3">Drawing renumbering</td><td className="p-3">1–2 hours</td><td className="p-3 text-teal-400">10 min</td></tr>
                  <tr><td className="p-3">Property management</td><td className="p-3">2–3 hours</td><td className="p-3 text-teal-400">15 min</td></tr>
                  <tr className="font-bold"><td className="p-3 text-white">Total</td><td className="p-3 text-white">8–13 hours</td><td className="p-3 text-teal-400">~70 min</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              That&apos;s <strong className="text-teal-400">6–11 hours returned to engineering work every week, per engineer.</strong>
            </p>

            <h3 className="font-orbitron text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-teal-400" /> Error Reduction
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Manual processes introduce errors. A mistyped part number, a missing BOM row, a PDF with the wrong revision — these mistakes cost far more to fix downstream than they cost to prevent. A reliable <strong className="text-white">design automation tool</strong> eliminates entire categories of human error.
            </p>

            <h3 className="font-orbitron text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target size={20} className="text-teal-400" /> Consistency
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              When every engineer uses the same tool with the same templates, outputs are consistent. BOMs look the same. PDFs are structured the same way. Properties follow the same schema. Consistency reduces confusion, speeds up reviews, and builds trust with manufacturing partners.
            </p>

            <h3 className="font-orbitron text-xl font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-teal-400" /> Payback Period
            </h3>
            <p className="text-gray-300 mb-0 leading-relaxed">
              For most teams, MetaMech pays for itself within the first month. If a single engineer saves 8 hours per week at a fully loaded cost of €50–80/hour, that&apos;s <strong className="text-teal-400">€400–640 per week</strong> in recovered productivity — per seat.
            </p>
          </div>

          {/* MetaMech vs. Alternatives */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              MetaMech vs. Alternatives
            </h2>
            <div className="overflow-x-auto mb-0">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="bg-[#0a1628]">
                    <th className="text-left p-3 font-orbitron text-white"></th>
                    <th className="text-left p-3 font-orbitron text-white">MetaMech</th>
                    <th className="text-left p-3 font-orbitron text-white">VBA Macros</th>
                    <th className="text-left p-3 font-orbitron text-white">DriveWorks</th>
                    <th className="text-left p-3 font-orbitron text-white">Custom Dev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="p-3 text-white font-medium">Setup time</td><td className="p-3 text-teal-400">Minutes</td><td className="p-3">Hours–days</td><td className="p-3">Weeks–months</td><td className="p-3">Months</td></tr>
                  <tr><td className="p-3 text-white font-medium">Coding required</td><td className="p-3 text-teal-400">None</td><td className="p-3">Yes (VBA)</td><td className="p-3">Some (rules engine)</td><td className="p-3">Yes (API/C#/VB)</td></tr>
                  <tr><td className="p-3 text-white font-medium">Maintenance</td><td className="p-3 text-teal-400">Included</td><td className="p-3">You</td><td className="p-3">You + vendor</td><td className="p-3">You</td></tr>
                  <tr><td className="p-3 text-white font-medium">BOM generation</td><td className="p-3 text-teal-400">✅</td><td className="p-3">⚠️</td><td className="p-3">✅</td><td className="p-3">✅</td></tr>
                  <tr><td className="p-3 text-white font-medium">PDF merge + index</td><td className="p-3 text-teal-400">✅</td><td className="p-3">❌</td><td className="p-3">❌</td><td className="p-3">Possible</td></tr>
                  <tr><td className="p-3 text-white font-medium">Batch STEP/DXF</td><td className="p-3 text-teal-400">✅</td><td className="p-3">⚠️</td><td className="p-3">❌</td><td className="p-3">Possible</td></tr>
                  <tr><td className="p-3 text-white font-medium">Drawing renumbering</td><td className="p-3 text-teal-400">✅</td><td className="p-3">❌</td><td className="p-3">❌</td><td className="p-3">Possible</td></tr>
                  <tr><td className="p-3 text-white font-medium">Property sync</td><td className="p-3 text-teal-400">✅</td><td className="p-3">⚠️</td><td className="p-3">✅</td><td className="p-3">Possible</td></tr>
                  <tr><td className="p-3 text-white font-medium">Cost</td><td className="p-3 text-teal-400">Affordable</td><td className="p-3">Free (+ your time)</td><td className="p-3">Enterprise pricing</td><td className="p-3">High</td></tr>
                  <tr><td className="p-3 text-white font-medium">Ideal for</td><td className="p-3 text-teal-400">Engineers &amp; small teams</td><td className="p-3">Solo tinkerers</td><td className="p-3">Large enterprises</td><td className="p-3">Companies with dev teams</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-6 mt-0">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">What is SolidWorks design automation?</h3>
                <p className="text-gray-300 leading-relaxed">SolidWorks design automation is the use of software tools to automate repetitive tasks in the SolidWorks design workflow — including BOM generation, file export, drawing management, and property synchronisation. It reduces manual effort, eliminates errors, and speeds up design releases.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Is MetaMech a SolidWorks add-in or a standalone application?</h3>
                <p className="text-gray-300 leading-relaxed">MetaMech is a standalone Windows desktop application built in VB.NET. It connects to SolidWorks via its API but runs as a separate program. You don&apos;t need to modify your SolidWorks installation.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Do I need programming skills to use MetaMech?</h3>
                <p className="text-gray-300 leading-relaxed">No. MetaMech is designed for mechanical engineers, not programmers. Every feature has a graphical interface. There&apos;s no VBA, no scripting, and no configuration files to edit.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">What versions of SolidWorks does MetaMech support?</h3>
                <p className="text-gray-300 leading-relaxed">MetaMech supports current and recent versions of SolidWorks. <Link href="/contact" className="text-teal-400 hover:text-teal-300 underline">Contact us</Link> for specific version compatibility.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Can MetaMech handle large assemblies?</h3>
                <p className="text-gray-300 leading-relaxed">Yes. MetaMech is designed to process assemblies with hundreds of parts. BOM extraction, batch export, and property sync all work at scale.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Does MetaMech work with SolidWorks PDM?</h3>
                <p className="text-gray-300 leading-relaxed">MetaMech operates on local files. It&apos;s designed for engineers working directly with SolidWorks files on their workstation, whether or not those files are managed by PDM.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">How is MetaMech different from SolidWorks Task Scheduler?</h3>
                <p className="text-gray-300 leading-relaxed">SolidWorks Task Scheduler handles basic batch operations like file conversion. MetaMech goes further with BOM generation, PDF merge and indexing, drawing renumbering, and template-driven property sync — tasks that Task Scheduler can&apos;t perform.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Is there a free trial?</h3>
                <p className="text-gray-300 leading-relaxed">Yes. Download the free trial and test every feature with your own SolidWorks files. No credit card required.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">What does a licence cost?</h3>
                <p className="text-gray-300 leading-relaxed">Visit our <Link href="/pricing" className="text-teal-400 hover:text-teal-300 underline">pricing page</Link> or <Link href="/contact" className="text-teal-400 hover:text-teal-300 underline">contact us</Link> for current pricing information.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Can I use MetaMech across my team?</h3>
                <p className="text-gray-300 leading-relaxed">Yes. MetaMech is designed to be deployed across design teams. Each engineer installs it on their workstation and uses the same templates and settings for consistent output.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="glass-card p-6 sm:p-8 text-center">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Start Automating Your SolidWorks Workflow
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Every minute spent on manual file management is a minute not spent on engineering. MetaMech is the <strong className="text-white">SolidWorks design automation</strong> platform that gives engineers their time back — starting today.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <Link
                href="/download"
                className="inline-flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-[#0a1628] font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                <Download size={18} />
                Download the Free Trial
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/features" className="text-teal-400 hover:text-teal-300 underline">See all features →</Link>
              <span className="text-gray-600">·</span>
              <Link href="/solidworks-macros" className="text-teal-400 hover:text-teal-300 underline">Read about SolidWorks macros →</Link>
              <span className="text-gray-600">·</span>
              <Link href="/about" className="text-teal-400 hover:text-teal-300 underline">About MetaMech →</Link>
              <span className="text-gray-600">·</span>
              <Link href="/contact" className="text-teal-400 hover:text-teal-300 underline">Contact us →</Link>
            </div>
          </div>

          <p className="text-gray-500 text-sm text-center mt-8 italic">
            MetaMech Solutions — SolidWorks design automation from Ireland, built for engineers everywhere.
          </p>

          <div className="mt-8 p-4 border border-gray-700/50 rounded-lg">
            <p className="text-gray-500 text-xs leading-relaxed">
              <strong className="text-gray-400">Disclaimer:</strong> MetaMech Solutions is an independent software provider and is not affiliated with, endorsed by, or sponsored by Dassault Systèmes, SolidWorks Corporation, or DriveWorks Ltd. SolidWorks® is a registered trademark of Dassault Systèmes SolidWorks Corporation. DriveWorks® is a registered trademark of DriveWorks Ltd. All other product names, trademarks, and registered trademarks mentioned on this page are the property of their respective owners. References to third-party products are for informational comparison purposes only.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
