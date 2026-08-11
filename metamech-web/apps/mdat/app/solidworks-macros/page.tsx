import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight, Download, MessageSquare, Zap, FileText, FileOutput, Hash, Settings } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'SolidWorks Macros — Ready-Made Automation Macros | MetaMech',
  description:
    'Discover powerful SolidWorks macros for BOM generation, PDF export, drawing renumbering and more. MetaMech delivers macro-level automation without writing a single line of VBA code.',
  openGraph: {
    title: 'SolidWorks Macros — Ready-Made Automation Macros | MetaMech',
    description:
      'Discover powerful SolidWorks macros for BOM generation, PDF export, drawing renumbering and more. MetaMech delivers macro-level automation without writing a single line of VBA code.',
    url: 'https://metamechsolutions.com/solidworks-macros',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/solidworks-macros' },
};

export default function SolidWorksMacrosPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'SolidWorks Macros', item: 'https://metamechsolutions.com/solidworks-macros' },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I need to know VBA to use MetaMech?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. MetaMech is a standalone desktop application. You don\'t write, edit, or maintain any macro code.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can MetaMech replace my existing SolidWorks macros?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'In most cases, yes. MetaMech covers the most common macro use cases — BOM export, PDF generation, batch file conversion, property management, and drawing renumbering. If you have a very specialised macro, contact us to discuss your workflow.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does MetaMech work with SolidWorks PDM?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MetaMech works with your local SolidWorks files. It\'s designed for engineers working directly with assemblies and drawings on their workstation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — download the free trial and test every feature with your own files.',
        },
      },
    ],
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'MetaMech',
    description: 'SolidWorks automation desktop application for BOM generation, PDF export, STEP/DXF batch export, drawing renumbering, and property management.',
    brand: {
      '@type': 'Organization',
      name: 'MetaMech Solutions',
    },
    url: 'https://metamechsolutions.com/solidworks-macros',
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
        name: 'Engineering Manager',
      },
      reviewBody: 'Our team doesn&apos;t have a programmer. MetaMech gives us the automation we need in a tool anyone can use.',
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={productSchema} />

      <main className="min-h-screen bg-[#0a1628] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumbs items={[{ name: 'SolidWorks Macros' }]} />

          {/* Hero */}
          <div className="mb-12">
            <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              SolidWorks Macros — Ready-Made <span className="text-teal-400">Automation</span> for Every Engineer
            </h1>
            <p className="text-gray-300 mb-4 leading-relaxed">
              If you&apos;ve ever spent an afternoon manually exporting drawings, copying properties between files, or rebuilding a bill of materials in Excel, you already know why <strong className="text-white">SolidWorks macros</strong> exist. They turn repetitive, error-prone tasks into one-click operations — and MetaMech takes that concept even further.
            </p>
          </div>

          {/* What Are SolidWorks Macros? */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              What Are SolidWorks Macros?
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              A <strong className="text-white">SolidWorks macro</strong> is a small program — usually written in VBA or VSTA — that automates actions inside SolidWorks. Instead of clicking through menus and dialog boxes, you record or code a sequence once and replay it whenever you need it.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">Common examples include:</p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-gray-300">
                <Check size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                Batch-saving assemblies to STEP or DXF
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <Check size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                Populating custom properties across dozens of parts
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <Check size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                Generating a BOM from an assembly and exporting it to Excel
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <Check size={16} className="text-teal-400 mt-1 flex-shrink-0" />
                Renumbering drawing sheets after a revision
              </li>
            </ul>
            <p className="text-gray-300 mb-0 leading-relaxed">
              Macros are powerful, but they come with a catch: <strong className="text-white">someone has to write, maintain, and debug them.</strong> That&apos;s where most engineering teams hit a wall.
            </p>
          </div>

          {/* Common Use Cases */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Common SolidWorks Macro Use Cases
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Engineers reach for SolidWorks macros when they need to:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="bg-[#0a1628]">
                    <th className="text-left p-3 font-orbitron text-white">Use Case</th>
                    <th className="text-left p-3 font-orbitron text-white">Manual Time</th>
                    <th className="text-left p-3 font-orbitron text-white">With a Macro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="p-3">Export 50 drawings to PDF</td><td className="p-3">~60 min</td><td className="p-3 text-teal-400">~2 min</td></tr>
                  <tr><td className="p-3">Update custom properties on 100 parts</td><td className="p-3">~90 min</td><td className="p-3 text-teal-400">~3 min</td></tr>
                  <tr><td className="p-3">Generate a BOM for a 500-part assembly</td><td className="p-3">~45 min</td><td className="p-3 text-teal-400">~1 min</td></tr>
                  <tr><td className="p-3">Batch export STEP + DXF files</td><td className="p-3">~40 min</td><td className="p-3 text-teal-400">~2 min</td></tr>
                  <tr><td className="p-3">Renumber drawings after ECO</td><td className="p-3">~30 min</td><td className="p-3 text-teal-400">~1 min</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 mb-0 leading-relaxed">
              The time savings are dramatic — but building and maintaining those macros requires VBA expertise that most mechanical engineers simply don&apos;t have.
            </p>
          </div>

          {/* The Problem with DIY Macros */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              The Problem with DIY SolidWorks Macros
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Writing your own SolidWorks macro sounds appealing until you hit reality:
            </p>
            <ul className="space-y-3 mb-0">
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                <span><strong className="text-white">VBA knowledge required</strong> — Most engineers aren&apos;t programmers. Learning VBA just to automate exports is a steep detour.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                <span><strong className="text-white">Fragile code</strong> — Macros break when SolidWorks updates, file structures change, or edge cases appear.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                <span><strong className="text-white">No UI</strong> — Raw macros run as scripts with no user-friendly interface, making them hard to share across a team.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                <span><strong className="text-white">No support</strong> — When something breaks at 4 PM on a Friday, there&apos;s no helpdesk for your homegrown VBA script.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-red-400 mt-1 flex-shrink-0">✗</span>
                <span><strong className="text-white">Security concerns</strong> — IT departments are rightly cautious about unsigned macro code running on engineering workstations.</span>
              </li>
            </ul>
          </div>

          {/* MetaMech Solution */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              MetaMech: Macro-Level Automation Without VBA Coding
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              <strong className="text-white">MetaMech</strong> gives you everything a SolidWorks macro delivers — and more — wrapped in a professional desktop application. No VBA. No scripting. No fragile workarounds.
            </p>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Built in VB.NET and designed specifically for SolidWorks, MetaMech packages the most common macro use cases into a polished, reliable tool:
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">BOM Generation</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Automatically extract a complete bill of materials from any assembly. Export to Excel with custom formatting, part numbers, and quantities — no macro coding needed.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <FileOutput size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">PDF Merge &amp; Index</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Batch-export drawings to PDF, merge them into a single document, and generate a clickable index. What used to require a SolidWorks macro plus a separate PDF tool is now one operation.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">STEP &amp; DXF Batch Export</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Select an assembly and export every part and sub-assembly to STEP, DXF, or both. MetaMech handles file naming, folder structure, and overwrites — tasks that trip up most SolidWorks macros.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Hash size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Drawing Renumbering</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Renumber drawing sheets and views in bulk after engineering changes. MetaMech updates references automatically, something that&apos;s notoriously difficult to do reliably with a VBA macro.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Settings size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Template &amp; Properties Sync</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Push property templates across hundreds of files. Keep part numbers, descriptions, materials, and revision fields consistent without opening each file individually.</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/features" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-medium transition-colors">
                See all MetaMech features <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Feature Comparison */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Feature Comparison: Manual vs. SolidWorks Macro vs. MetaMech
            </h2>
            <div className="overflow-x-auto mb-0">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="bg-[#0a1628]">
                    <th className="text-left p-3 font-orbitron text-white">Capability</th>
                    <th className="text-left p-3 font-orbitron text-white">Manual</th>
                    <th className="text-left p-3 font-orbitron text-white">Custom VBA Macro</th>
                    <th className="text-left p-3 font-orbitron text-white">MetaMech</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr><td className="p-3">BOM generation</td><td className="p-3">❌ Copy-paste from SolidWorks</td><td className="p-3">⚠️ Possible but fragile</td><td className="p-3 text-teal-400">✅ One-click, formatted export</td></tr>
                  <tr><td className="p-3">PDF batch export + merge</td><td className="p-3">❌ File by file</td><td className="p-3">⚠️ Export only, no merge/index</td><td className="p-3 text-teal-400">✅ Export, merge &amp; index combined</td></tr>
                  <tr><td className="p-3">STEP/DXF batch export</td><td className="p-3">❌ Open each part, Save As</td><td className="p-3">⚠️ Basic batch possible</td><td className="p-3 text-teal-400">✅ Full batch with naming rules</td></tr>
                  <tr><td className="p-3">Drawing renumbering</td><td className="p-3">❌ Manual, error-prone</td><td className="p-3">⚠️ Very difficult in VBA</td><td className="p-3 text-teal-400">✅ Automated with reference updates</td></tr>
                  <tr><td className="p-3">Property sync</td><td className="p-3">❌ Edit each file</td><td className="p-3">⚠️ Possible but risky</td><td className="p-3 text-teal-400">✅ Template-driven, safe</td></tr>
                  <tr><td className="p-3">User interface</td><td className="p-3">N/A</td><td className="p-3">❌ Script/command-line</td><td className="p-3 text-teal-400">✅ Professional desktop app</td></tr>
                  <tr><td className="p-3">Maintenance &amp; updates</td><td className="p-3">N/A</td><td className="p-3">❌ You maintain it</td><td className="p-3 text-teal-400">✅ Maintained by MetaMech</td></tr>
                  <tr><td className="p-3">Team-friendly</td><td className="p-3">N/A</td><td className="p-3">❌ Hard to share</td><td className="p-3 text-teal-400">✅ Install and go</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Testimonials */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-6 mt-0">
              What Engineers Are Saying
            </h2>
            <div className="space-y-6">
              <blockquote className="border-l-2 border-teal-400 pl-4">
                <p className="text-gray-300 italic leading-relaxed mb-2">
                  &quot;We were spending half a day every week on PDF exports alone. MetaMech turned that into a 5-minute job. It&apos;s like having a library of perfectly written SolidWorks macros without touching VBA.&quot;
                </p>
                <footer className="text-gray-500 text-sm">— Senior Mechanical Engineer, Manufacturing Firm</footer>
              </blockquote>
              <blockquote className="border-l-2 border-teal-400 pl-4">
                <p className="text-gray-300 italic leading-relaxed mb-2">
                  &quot;I tried writing my own macros for property management. After the third time they broke during an update, I switched to MetaMech. Haven&apos;t looked back.&quot;
                </p>
                <footer className="text-gray-500 text-sm">— Design Engineer, Contract Engineering Company</footer>
              </blockquote>
              <blockquote className="border-l-2 border-teal-400 pl-4">
                <p className="text-gray-300 italic leading-relaxed mb-2">
                  &quot;Our team doesn&apos;t have a programmer. MetaMech gives us the automation we need in a tool anyone can use.&quot;
                </p>
                <footer className="text-gray-500 text-sm">— Engineering Manager, OEM Manufacturer</footer>
              </blockquote>
            </div>
          </div>

          {/* FAQ */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-6 mt-0">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Do I need to know VBA to use MetaMech?</h3>
                <p className="text-gray-300 leading-relaxed">No. MetaMech is a standalone desktop application. You don&apos;t write, edit, or maintain any macro code.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Can MetaMech replace my existing SolidWorks macros?</h3>
                <p className="text-gray-300 leading-relaxed">In most cases, yes. MetaMech covers the most common macro use cases — BOM export, PDF generation, batch file conversion, property management, and drawing renumbering. If you have a very specialised macro, <Link href="/contact" className="text-teal-400 hover:text-teal-300 underline">contact us</Link> to discuss your workflow.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Does MetaMech work with SolidWorks PDM?</h3>
                <p className="text-gray-300 leading-relaxed">MetaMech works with your local SolidWorks files. It&apos;s designed for engineers working directly with assemblies and drawings on their workstation.</p>
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-bold text-white mb-2">Is there a free trial?</h3>
                <p className="text-gray-300 leading-relaxed">Yes — download the free trial and test every feature with your own files.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="glass-card p-6 sm:p-8 text-center">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Stop Writing Macros. Start Shipping Designs.
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Every hour you spend debugging VBA is an hour you&apos;re not engineering. MetaMech gives you production-ready SolidWorks automation from day one — no coding, no maintenance, no risk.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <Link
                href="/download"
                className="inline-flex items-center gap-2 bg-teal-400 hover:bg-teal-300 text-[#0a1628] font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                <Download size={18} />
                Download the Free Trial
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 border border-teal-400/50 text-teal-400 hover:bg-teal-400 hover:text-[#0a1628] font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                See How MetaMech Compares <ArrowRight size={16} />
              </Link>
            </div>
            <p className="text-gray-500 text-sm">
              Have questions? <Link href="/contact" className="text-teal-400 hover:text-teal-300 underline">Talk to us →</Link>
            </p>
          </div>

          <p className="text-gray-500 text-sm text-center mt-8 italic">
            MetaMech Solutions is an Ireland-based company building automation tools for SolidWorks engineers. <Link href="/about" className="text-teal-400 hover:text-teal-300 underline">Learn more about us →</Link>
          </p>
        </div>
      </main>
    </>
  );
}
