import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Clock, Target, Settings, BarChart3, Rocket, FileText, Wrench } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'The Complete Guide to SolidWorks Automation in 2026',
  description:
    'Learn everything about SolidWorks automation in 2026 — from macros and API scripting to dedicated tools like MetaMech. Boost productivity, reduce errors, and save hundreds of engineering hours.',
  openGraph: {
    title: 'The Complete Guide to SolidWorks Automation in 2026',
    description:
      'Learn everything about SolidWorks automation in 2026 — from macros and API scripting to dedicated tools like MetaMech.',
    url: 'https://metamechsolutions.com/blog/solidworks-automation-guide-2026',
    type: 'article',
  },
  alternates: { canonical: 'https://metamechsolutions.com/blog/solidworks-automation-guide-2026' },
};

export default function SolidWorksAutomationGuide2026() {
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
              name: 'SolidWorks Automation Guide 2026',
              item: 'https://metamechsolutions.com/blog/solidworks-automation-guide-2026',
            },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'The Complete Guide to SolidWorks Automation in 2026',
          description:
            'Learn everything about SolidWorks automation in 2026 — from macros and API scripting to dedicated tools like MetaMech.',
          author: { '@type': 'Organization', name: 'MetaMech Engineering Team' },
          publisher: { '@type': 'Organization', name: 'MetaMech Solutions', url: 'https://metamechsolutions.com' },
          datePublished: '2026-02-12',
          dateModified: '2026-02-12',
          mainEntityOfPage: 'https://metamechsolutions.com/blog/solidworks-automation-guide-2026',
        }}
      />

      <main className="min-h-screen bg-[#0a1628] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: 'Blog', href: '/blog' },
              { name: 'SolidWorks Automation Guide 2026' },
            ]}
          />

          <article className="glass-card p-8 md:p-12">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span>February 12, 2026</span>
                <span>·</span>
                <span>12 min read</span>
                <span>·</span>
                <span>MetaMech Engineering Team</span>
              </div>
              <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                The Complete Guide to <span className="text-teal-400">SolidWorks Automation</span> in 2026
              </h1>
              <p className="text-lg text-gray-300">
                If you&apos;re a mechanical engineer or design team leader still doing repetitive SolidWorks tasks by hand, 2026 is the year to change that. SolidWorks automation has matured from a niche practice into a competitive necessity — and the engineers who embrace it are shipping faster, making fewer errors, and reclaiming hours every single week.
              </p>
              <p className="text-lg text-gray-300 mt-4">
                This guide covers everything you need to know: what SolidWorks automation actually is, the different approaches available, how to get started, and the real-world ROI you can expect.
              </p>
            </div>

            {/* What Is SolidWorks Automation? */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                What Is SolidWorks Automation?
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                At its simplest, SolidWorks automation means using software to perform repetitive CAD tasks without manual intervention. Instead of clicking through the same 30-step process every time you create a drawing or export a file, you let code — or a dedicated tool — handle it for you.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Common tasks that benefit from SolidWorks automation include:
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Batch file exports</strong> (PDF, STEP, DXF) across hundreds of drawings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">BOM generation and formatting</strong> to company standards</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Drawing creation</strong> from part/assembly templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Property management</strong> — filling in custom properties, part numbers, revision codes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">File renaming and organisation</strong> following naming conventions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Design table population</strong> for product configurators</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Print and export workflows</strong> tied to release processes</span>
                </li>
              </ul>
              <p className="text-gray-300 mb-4 leading-relaxed">
                The principle is straightforward: if you do it more than twice, automate it.
              </p>
            </section>

            {/* Why SolidWorks Automation Matters in 2026 */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                Why SolidWorks Automation Matters in 2026
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                The pressure on engineering teams has never been higher. Product cycles are shorter. Supply chains demand more documentation. Quality standards (ISO, FDA, CE) require traceability that manual processes can&apos;t reliably deliver.
              </p>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Here&apos;s what&apos;s changed recently:
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                1. Labour Costs Keep Rising
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Engineering salaries across Europe and North America have climbed steadily. Every hour an engineer spends on administrative CAD tasks is an hour not spent on actual design. SolidWorks automation directly addresses this by offloading low-value work.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                2. Error Rates Compound
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                A mistyped revision number or a forgotten BOM update might seem minor. Multiply that across a 500-part assembly released quarterly, and you&apos;ve got a quality problem. Automation eliminates entire categories of human error.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                3. Teams Are Distributed
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                With hybrid and remote work now standard, you can&apos;t rely on someone walking over to check a file. Automated workflows ensure consistency regardless of who runs them or where they sit.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                4. Compliance Is Non-Negotiable
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Regulated industries — medtech, aerospace, automotive — need audit trails. Automated processes produce repeatable, documentable results every time.
              </p>
            </section>

            {/* Types of SolidWorks Automation */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                Types of SolidWorks Automation
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Not all automation is created equal. Here are the three main approaches, from simplest to most powerful.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                VBA Macros
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                SolidWorks ships with a built-in macro recorder and VBA editor. You can record a sequence of actions, then replay it. For simple, single-task automation — like exporting the active document as a PDF — macros work fine.
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Pros:</strong> Free, built into SolidWorks, low barrier to entry.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Cons:</strong> Fragile, hard to maintain, limited error handling, no UI for non-technical users.</span>
                </li>
              </ul>
              <p className="text-gray-300 mb-4 leading-relaxed">
                We&apos;ve written a detailed breakdown: see our post on{' '}
                <Link href="/blog/solidworks-macro-vs-automation-tool" className="text-teal-400 hover:text-teal-300 underline">
                  SolidWorks Macros vs Automation Tools
                </Link>.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                SolidWorks API (C#, VB.NET, Python)
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                The SolidWorks API gives you full programmatic access to nearly every feature in the software. With C# or VB.NET, you can build standalone applications, add-ins, or scripts that do virtually anything SolidWorks can do — and plenty it can&apos;t do natively.
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Pros:</strong> Extremely powerful, full control, can integrate with other systems (ERP, PDM, databases).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Cons:</strong> Requires real programming skills, significant development time, ongoing maintenance burden.</span>
                </li>
              </ul>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Dedicated Automation Tools
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                This is where tools like{' '}
                <Link href="/" className="text-teal-400 hover:text-teal-300 underline">MetaMech</Link>{' '}
                sit. Instead of writing code from scratch, you get a desktop application purpose-built for SolidWorks automation. The common workflows — batch export, BOM management, property editing, drawing generation — are already built, tested, and ready to use.
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Pros:</strong> No coding required, professional UI, maintained and updated, immediate productivity gains.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Cons:</strong> Monthly/annual cost (though ROI typically pays for itself within weeks).</span>
                </li>
              </ul>
            </section>

            {/* How to Get Started */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                How to Get Started with SolidWorks Automation
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Whether you&apos;re a solo engineer or leading a team of 20, here&apos;s a practical roadmap.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Step 1: Audit Your Repetitive Tasks
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Spend one week tracking every repetitive task you perform in SolidWorks. Note:
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <Target className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>What the task is</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>How long it takes</span>
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>How often you do it (daily, weekly, per project)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>How error-prone it is</span>
                </li>
              </ul>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Common winners: file exports, property updates, drawing creation, BOM formatting, file renaming.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Step 2: Prioritise by Impact
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Rank your list by <strong className="text-white">time saved × frequency</strong>. A task that takes 5 minutes but happens 20 times a week (100 minutes/week) beats a 30-minute task you do monthly.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Step 3: Choose Your Approach
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Use this decision framework:
              </p>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-gray-300">
                  <thead>
                    <tr className="bg-[#0a1628]">
                      <th className="text-left p-3 font-semibold text-white">Scenario</th>
                      <th className="text-left p-3 font-semibold text-white">Best Approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-white/10">
                      <td className="p-3">One-off simple task</td>
                      <td className="p-3">VBA macro</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Complex integration with ERP/PDM</td>
                      <td className="p-3">Custom API development</td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Standard workflows (export, BOM, properties)</td>
                      <td className="p-3">Dedicated tool like <Link href="/tools" className="text-teal-400 hover:text-teal-300 underline">MetaMech</Link></td>
                    </tr>
                    <tr className="border-t border-white/10">
                      <td className="p-3">Team-wide standardisation</td>
                      <td className="p-3">Dedicated tool</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                For most engineering teams, a dedicated design automation tool covers 80–90% of automation needs without writing a single line of code.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Step 4: Start Small, Then Scale
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Don&apos;t try to automate everything at once. Pick your highest-impact task, automate it, measure the results, then move to the next one. This builds confidence and generates internal buy-in.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Step 5: Standardise and Document
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Once a workflow is automated, document it. Make it part of your team&apos;s standard operating procedure. This is especially important for regulated industries where process documentation is mandatory.
              </p>
            </section>

            {/* ROI Section */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                ROI of SolidWorks Automation: Real Numbers
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Let&apos;s do the maths with conservative estimates.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Scenario: A 5-Person Engineering Team
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed"><strong className="text-white">Assumptions:</strong></p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>Average engineer salary: €65,000/year (≈ €34/hour fully loaded)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>Each engineer spends 6 hours/week on repetitive SolidWorks tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span>Automation eliminates 80% of that time</span>
                </li>
              </ul>

              <div className="bg-white/5 border border-teal-500/20 rounded-xl p-6 mb-6">
                <p className="text-gray-300 mb-2"><strong className="text-white">Weekly time saved:</strong> 5 engineers × 6 hours × 0.80 = <span className="text-teal-400 font-bold">24 hours/week</span></p>
                <p className="text-gray-300 mb-2"><strong className="text-white">Annual value recovered:</strong> 24 hours × 48 weeks × €34 = <span className="text-teal-400 font-bold">€39,168/year</span></p>
                <p className="text-gray-300 mb-2"><strong className="text-white">Cost of a tool like MetaMech:</strong> A fraction of that figure. Check{' '}
                  <Link href="/pricing" className="text-teal-400 hover:text-teal-300 underline">current pricing</Link>.</p>
                <p className="text-gray-300"><strong className="text-white">ROI payback period:</strong> Typically <span className="text-teal-400 font-bold">2–4 weeks</span>.</p>
              </div>

              <p className="text-gray-300 mb-4 leading-relaxed">
                And that&apos;s before you factor in error reduction, faster time-to-market, and improved compliance — all of which have their own financial impact.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                For Solo Engineers
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Even a single engineer saving 5 hours/week recovers over <strong className="text-white">€8,000/year</strong> in productive time. That&apos;s time you can spend on actual engineering — the work you trained for and enjoy.
              </p>
            </section>

            {/* Common Workflows */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                Common SolidWorks Automation Workflows
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Here are the workflows that deliver the biggest bang for your buck.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Batch PDF/STEP/DXF Export
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Export hundreds of drawings or models in a single operation. Set naming conventions, output folders, and revision handling once — then let it run.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Automated BOM Generation
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Pull Bill of Materials data from assemblies, format it to your company template, and export to Excel or your ERP system. No more manual copy-paste errors.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Custom Property Management
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Fill in part numbers, descriptions, materials, revision codes, and any custom property across hundreds of files. MetaMech&apos;s{' '}
                <Link href="/tools" className="text-teal-400 hover:text-teal-300 underline">property tools</Link>{' '}
                make this a bulk operation instead of a file-by-file chore.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                Drawing Creation from Templates
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Generate drawings automatically from parts or assemblies using predefined templates. Views, dimensions, title blocks — all populated without manual intervention.
              </p>

              <h3 className="font-orbitron text-xl font-bold text-white mb-3 mt-8">
                File Renaming and Organisation
              </h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Rename files according to naming conventions, update internal references, and reorganise folder structures — all without breaking SolidWorks links.
              </p>
            </section>

            {/* What Makes MetaMech Different */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                What Makes MetaMech Different
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                There are several SolidWorks automation tools on the market. Here&apos;s why engineering teams choose{' '}
                <Link href="/" className="text-teal-400 hover:text-teal-300 underline">MetaMech</Link>:
              </p>
              <ul className="space-y-2 mb-6 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Desktop-first:</strong> Runs locally alongside SolidWorks. No cloud dependency, no latency, no data leaving your machine.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Built in Ireland:</strong> Developed by engineers who understand European manufacturing, regulatory requirements, and the Irish engineering ecosystem.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">All-in-one:</strong> Batch export, BOM tools, property management, drawing automation — all in a single application. No juggling multiple add-ins.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">No coding required:</strong> A clean, intuitive interface means any SolidWorks user can automate workflows on day one.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
                  <span><strong className="text-white">Actively maintained:</strong> Regular updates, responsive support, and a roadmap driven by real user feedback.</span>
                </li>
              </ul>
            </section>

            {/* Getting Started with MetaMech */}
            <section className="mb-10">
              <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-12">
                Getting Started with MetaMech
              </h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Ready to stop doing repetitive work by hand?
              </p>
              <ol className="space-y-3 mb-6 text-gray-300 list-decimal list-inside">
                <li>
                  <strong className="text-white"><Link href="/download" className="text-teal-400 hover:text-teal-300 underline">Download MetaMech</Link></strong> — free trial available, no credit card required.
                </li>
                <li>
                  <strong className="text-white">Run your first automation</strong> — batch export your current project&apos;s drawings in under 5 minutes.
                </li>
                <li>
                  <strong className="text-white">Measure the difference</strong> — track the time you save in your first week.
                </li>
              </ol>
              <p className="text-gray-300 mb-4 leading-relaxed">
                SolidWorks automation isn&apos;t a future trend. It&apos;s a present-day advantage that separates efficient teams from overworked ones. The tools are ready. The ROI is proven. The only question is how much longer you&apos;ll wait.
              </p>
            </section>

            {/* CTA */}
            <section className="mt-12 glass-card p-8 border-t-2 border-gradient-to-r from-teal-500 to-[#d4af37] text-center" style={{ borderTop: '2px solid #2dd4bf' }}>
              <h2 className="font-orbitron text-2xl font-bold text-white mb-3">
                Ready to Automate Your SolidWorks Workflow?
              </h2>
              <p className="text-gray-300 mb-6 max-w-xl mx-auto">
                MetaMech gives you batch export, BOM management, property editing, and drawing automation in one powerful desktop app. No coding required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-teal-400 text-[#0a1628] font-semibold rounded-lg hover:bg-teal-300 transition-colors"
                >
                  Download Free Trial <ArrowRight className="w-5 h-5" />
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
