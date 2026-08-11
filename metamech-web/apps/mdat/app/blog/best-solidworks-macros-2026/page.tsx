import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, FileText, Settings, Printer, Wrench, Package, Layers, Eye, Scale, AlertTriangle, X } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: '15 Best SolidWorks Macros Every Engineer Needs in 2026',
  description:
    'Discover the 15 best SolidWorks macros for 2026 — from batch PDF export to BOM automation. Learn what each macro does, plus how MetaMech bundles them all into one powerful tool.',
  openGraph: {
    title: '15 Best SolidWorks Macros Every Engineer Needs in 2026',
    description:
      'Discover the 15 best SolidWorks macros for 2026 — from batch PDF export to BOM automation.',
    url: 'https://metamechsolutions.com/blog/best-solidworks-macros-2026',
    type: 'article',
  },
  alternates: { canonical: 'https://metamechsolutions.com/blog/best-solidworks-macros-2026' },
};

export default function BestSolidWorksMacros2026() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://metamechsolutions.com/blog' },
            {
              '@type': 'ListItem',
              position: 3,
              name: '15 Best SolidWorks Macros 2026',
              item: 'https://metamechsolutions.com/blog/best-solidworks-macros-2026',
            },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: '15 Best SolidWorks Macros Every Engineer Needs in 2026',
          description:
            'Discover the 15 best SolidWorks macros for 2026 — from batch PDF export to BOM automation.',
          author: { '@type': 'Organization', name: 'MetaMech Engineering Team' },
          publisher: { '@type': 'Organization', name: 'MetaMech Solutions', url: 'https://metamechsolutions.com' },
          datePublished: '2026-02-12',
          dateModified: '2026-02-12',
          mainEntityOfPage: 'https://metamechsolutions.com/blog/best-solidworks-macros-2026',
        }}
      />

      <main className="min-h-screen bg-[#0a1628] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: 'Blog', href: '/blog' },
              { name: '15 Best SolidWorks Macros 2026' },
            ]}
          />

          <article className="glass-card p-8 md:p-12">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span>February 12, 2026</span>
                <span>·</span>
                <span>14 min read</span>
                <span>·</span>
                <span>MetaMech Engineering Team</span>
              </div>
              <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                15 Best <span className="text-teal-400">SolidWorks Macros</span> Every Engineer Needs in 2026
              </h1>
              <p className="text-lg text-gray-300">
                Every experienced SolidWorks user eventually hits the same wall: too much repetitive work, not enough hours. That&apos;s where the SolidWorks macro comes in — a small script that automates a task you&apos;d otherwise do by hand, saving minutes (or hours) every single day.
              </p>
              <p className="text-lg text-gray-300 mt-4">
                The problem? Finding the right macros, getting them to work reliably, and maintaining them over time. In this post, we&apos;ll cover the <strong className="text-white">15 most useful SolidWorks macros</strong> for mechanical engineers in 2026, explain what each one does, and show you a better path forward for teams that have outgrown individual scripts.
              </p>
            </div>

            {/* What Is a SolidWorks Macro? */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                What Is a SolidWorks Macro?
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                A SolidWorks macro is a small program — typically written in VBA (Visual Basic for Applications) — that automates tasks within the SolidWorks environment. You can record a macro using the built-in recorder, or write one from scratch using the SolidWorks API.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Every SolidWorks macro runs inside the application and can access models, drawings, assemblies, custom properties, and more. They&apos;re the simplest entry point into{' '}
                <Link href="/blog/solidworks-automation-guide-2026" className="text-teal-400 hover:text-teal-300 underline">SolidWorks automation</Link>.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Now, let&apos;s get to the list.
              </p>
            </section>

            {/* Macro 1 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                1. Batch Export to PDF
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Exports all open drawings (or all drawings in a folder) to PDF in one operation.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                This is arguably the most popular SolidWorks macro in existence. Instead of opening each drawing, clicking File → Save As → PDF → choosing a folder → clicking Save, this macro handles the entire batch automatically.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">Time saved:</strong> 2–3 minutes per drawing. For a 50-drawing release package, that&apos;s over two hours recovered.
              </p>
            </section>

            {/* Macro 2 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                2. Batch Export to STEP
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Exports parts and assemblies to STEP (or IGES, Parasolid, STL) format in bulk.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Suppliers and customers constantly request neutral file formats. This SolidWorks macro iterates through your files and exports each one to STEP with consistent naming and output settings.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">Why it matters:</strong> Eliminates the tedious open-export-close-repeat cycle that eats into every engineer&apos;s day.
              </p>
            </section>

            {/* Macro 3 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                3. BOM Export to Excel
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Pulls the Bill of Materials from an assembly and exports it to a formatted Excel spreadsheet.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                A well-written BOM export macro maps SolidWorks properties (part number, description, material, quantity) directly into your company&apos;s BOM template. No more manual transcription errors.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">Pro tip:</strong> The best versions of this SolidWorks macro handle multi-level BOMs and indented structures automatically.
              </p>
            </section>

            {/* Macro 4 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                4. Custom Property Writer
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Fills in custom properties (part number, description, revision, material, author) across multiple files.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Custom properties drive title blocks, BOMs, and PDM workflows. Keeping them accurate and consistent across hundreds of files is a nightmare without automation. This macro lets you define values once and apply them in bulk.
              </p>
            </section>

            {/* Macro 5 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                5. Drawing Renumber / Revision Updater
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Updates revision letters or drawing numbers across a set of files, including title block references.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                When you release a new revision, every affected drawing needs updating. A renumbering SolidWorks macro ensures the revision field, title block, and file properties all stay in sync — no missed updates.
              </p>
            </section>

            {/* Macro 6 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                6. Batch Print
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Sends multiple drawings to a printer (or virtual printer) with predefined settings.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Paper size, orientation, scale, line weights — configure them once in the macro, then print 100 drawings without touching a single dialog box. This SolidWorks macro is essential for teams that still deliver hard-copy drawing packages.
              </p>
            </section>

            {/* Macro 7 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                7. Auto-Dimension
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Automatically adds key dimensions to drawing views based on model geometry.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                While SolidWorks has built-in auto-dimension features, a custom macro can apply your company&apos;s dimensioning standards — placement rules, tolerance formats, and datum references — more consistently than the default tool.
              </p>
            </section>

            {/* Macro 8 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                8. File Rename with Reference Update
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Renames SolidWorks files while updating all internal references so assemblies and drawings don&apos;t break.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Renaming files in Windows Explorer breaks SolidWorks references. This macro (or the equivalent functionality in SolidWorks PDM) handles renaming safely. It&apos;s one of the most requested SolidWorks macros on engineering forums.
              </p>
            </section>

            {/* Macro 9 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                9. Pack and Go Automator
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Automates the Pack and Go process with predefined naming rules and output locations.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Sending a complete project to a supplier or archiving a release? This SolidWorks macro runs Pack and Go with your standard settings — prefix, suffix, target folder — without the manual dialog.
              </p>
            </section>

            {/* Macro 10 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                10. Material Applicator
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Applies materials to parts in bulk based on a spreadsheet or rule set.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                If your parts follow naming conventions that indicate material (e.g., suffix &quot;-SS&quot; for stainless steel), this macro can read the convention and apply the correct SolidWorks material automatically.
              </p>
            </section>

            {/* Macro 11 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                11. View Orientation Standardiser
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Sets standard view orientations across multiple drawing sheets to match your company template.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Different engineers place views differently. This SolidWorks macro enforces a consistent layout: front view position, scale, projection type (first-angle or third-angle). Consistency across hundreds of drawings.
              </p>
            </section>

            {/* Macro 12 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                12. Mass Property Exporter
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Extracts mass, volume, centre of gravity, and moments of inertia from parts/assemblies and exports to a spreadsheet.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Essential for structural analysis, shipping calculations, and regulatory submissions. Running mass properties manually on 200 parts is tedious — a macro does it in seconds.
              </p>
            </section>

            {/* Macro 13 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                13. Interference Detection Report
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Runs interference detection on assemblies and exports results to a formatted report.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Quality checks before release should be automated, not manual. This SolidWorks macro runs the check and produces a document you can attach to your design review.
              </p>
            </section>

            {/* Macro 14 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                14. Title Block Updater
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Updates title block fields (company name, logo, approval fields, date formats) across all drawings in a project.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Rebranding? New approval workflow? Changing date format from MM/DD/YYYY to DD/MM/YYYY? This macro applies the change everywhere without opening each drawing individually.
              </p>
            </section>

            {/* Macro 15 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                15. DXF Export for Laser/Waterjet
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                <strong className="text-white">What it does:</strong> Exports flat patterns from sheet metal parts to DXF, with correct layer mapping for your fabrication shop.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Sheet metal engineers use this SolidWorks macro constantly. The best versions handle bend lines, forming tool marks, and outer profiles on separate layers — exactly how your laser cutter or waterjet operator needs them.
              </p>
            </section>

            {/* The Problem with Managing 15 Individual Macros */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                The Problem with Managing 15 Individual Macros
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                If you&apos;ve read this far, you might be thinking: <em>&quot;Great, I&apos;ll just grab all 15 macros and I&apos;m sorted.&quot;</em>
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Not so fast. Here&apos;s the reality of managing a library of SolidWorks macros:
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Maintenance Overhead
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Each SolidWorks macro is a separate piece of code. When SolidWorks releases a service pack or new version, any of these macros can break. Someone on your team needs to debug VBA code — and that someone is usually the engineer who should be designing, not coding.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                No Unified Interface
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Fifteen macros means fifteen different ways to run them — toolbar buttons, keyboard shortcuts, or navigating to the macro file. There&apos;s no central dashboard, no consistent UI, no settings panel.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Error Handling Is Minimal
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Most free SolidWorks macros found online have little to no error handling. If a file is read-only, a reference is missing, or a property doesn&apos;t exist, the macro either crashes or silently produces wrong output.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                No Team Standardisation
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                When each engineer maintains their own macro collection, you lose consistency. Engineer A&apos;s PDF export macro uses different naming conventions than Engineer B&apos;s. Now your document control team has a problem.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Version Control Nightmares
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Which version of the BOM export macro is the &quot;right&quot; one? The one on the shared drive? Dave&apos;s copy? The one in the wiki that hasn&apos;t been updated since 2023?
              </p>
            </section>

            {/* A Better Approach: MetaMech */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                A Better Approach: MetaMech
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                This is exactly the problem{' '}
                <Link href="/" className="text-teal-400 hover:text-teal-300 underline">MetaMech</Link>{' '}
                was built to solve.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Instead of cobbling together individual SolidWorks macros, MetaMech bundles <strong className="text-white">all of the above workflows — and more — into a single desktop application</strong>. Every feature listed in this post is available through a clean, intuitive interface with proper error handling, consistent settings, and team-wide standardisation.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                What MetaMech Gives You Over Individual Macros
              </h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-gray-300">
                  <thead>
                    <tr className="bg-[#0a1628]">
                      <th className="text-left p-3 font-semibold text-white">Feature</th>
                      <th className="text-left p-3 font-semibold text-white">Individual Macros</th>
                      <th className="text-left p-3 font-semibold text-white">MetaMech</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Batch PDF/STEP/DXF export</td>
                      <td className="p-3">✅ (separate macros)</td>
                      <td className="p-3">✅ (unified tool)</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">BOM export</td>
                      <td className="p-3">✅ (fragile)</td>
                      <td className="p-3">✅ (robust, templated)</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Custom property management</td>
                      <td className="p-3">✅ (basic)</td>
                      <td className="p-3">✅ (bulk, with validation)</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Drawing automation</td>
                      <td className="p-3">⚠️ (limited)</td>
                      <td className="p-3">✅ (template-driven)</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Error handling</td>
                      <td className="p-3">❌ (minimal)</td>
                      <td className="p-3">✅ (comprehensive)</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Consistent UI</td>
                      <td className="p-3">❌</td>
                      <td className="p-3">✅</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Team standardisation</td>
                      <td className="p-3">❌</td>
                      <td className="p-3">✅</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Maintained &amp; updated</td>
                      <td className="p-3">❌ (DIY)</td>
                      <td className="p-3">✅ (regular releases)</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Support</td>
                      <td className="p-3">❌ (forum posts)</td>
                      <td className="p-3">✅ (dedicated support)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                No Coding Required
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                The biggest advantage: you don&apos;t need to write, debug, or maintain a single SolidWorks macro. MetaMech&apos;s interface lets any SolidWorks user — regardless of programming ability — run sophisticated automation workflows.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Explore the full feature set at{' '}
                <Link href="/tools" className="text-teal-400 hover:text-teal-300 underline">metamechsolutions.com/tools</Link>.
              </p>
            </section>

            {/* When Individual Macros Still Make Sense */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                When Individual Macros Still Make Sense
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                To be fair, there are scenarios where a standalone SolidWorks macro is the right call:
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Highly custom, one-off tasks</strong> that no general tool covers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Quick personal shortcuts</strong> for your specific workflow</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Learning the SolidWorks API</strong> — macros are a great educational tool</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Budget constraints</strong> where free is the only option (though MetaMech&apos;s{' '}
                    <Link href="/pricing" className="text-teal-400 hover:text-teal-300 underline">pricing</Link>{' '}
                    is designed to pay for itself quickly)</span>
                </li>
              </ul>
              <p className="text-gray-300 mb-4 leading-relaxed">
                For everything else — especially if you&apos;re on a team, working to deadlines, or in a regulated industry — a dedicated design automation tool is the smarter investment.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                For a deeper comparison, read our post:{' '}
                <Link href="/blog/solidworks-macro-vs-automation-tool" className="text-teal-400 hover:text-teal-300 underline">
                  SolidWorks Macros vs Automation Tools: Which Should You Use?
                </Link>
              </p>
            </section>

            {/* CTA */}
            <section className="mt-12 glass-card p-8 text-center" style={{ borderTop: '2px solid #2dd4bf' }}>
              <h2 className="font-orbitron text-2xl font-bold text-white mb-3">
                Start Automating Today
              </h2>
              <p className="text-gray-300 mb-6 max-w-xl mx-auto">
                Whether you start with individual SolidWorks macros or jump straight to a professional tool, the key is to <strong className="text-white">start</strong>. Every hour you spend on repetitive manual work is an hour you&apos;re not spending on design, innovation, or going home on time.
              </p>
              <p className="text-gray-300 mb-6">
                Ready to replace your macro collection with something better?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-teal-400 text-[#0a1628] font-semibold rounded-lg hover:bg-teal-300 transition-colors"
                >
                  Download MetaMech Free Trial <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/tools"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-teal-400 text-teal-400 font-semibold rounded-lg hover:bg-teal-400/10 transition-colors"
                >
                  Explore All Tools
                </Link>
              </div>
            </section>

            {/* Footer note */}
            <p className="text-sm text-gray-500 mt-8 text-center">
              MetaMech is a SolidWorks automation desktop app built in Ireland.{' '}
              <Link href="/tools" className="text-teal-400 hover:text-teal-300 underline">Explore all tools</Link> |{' '}
              <Link href="/pricing" className="text-teal-400 hover:text-teal-300 underline">View pricing</Link> |{' '}
              <Link href="/download" className="text-teal-400 hover:text-teal-300 underline">Download free trial</Link>
            </p>
          </article>
        </div>
      </main>
    </>
  );
}
