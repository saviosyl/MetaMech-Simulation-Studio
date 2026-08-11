import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Download, MapPin, Users, Heart, Shield, Lightbulb } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'About MetaMech Solutions — SolidWorks Automation from Ireland',
  description:
    'MetaMech Solutions is an Ireland-based engineering automation company. We build desktop tools that help SolidWorks engineers automate BOM generation, PDF exports, batch file conversion and more.',
  openGraph: {
    title: 'About MetaMech Solutions — SolidWorks Automation from Ireland',
    description:
      'MetaMech Solutions is an Ireland-based engineering automation company. We build desktop tools that help SolidWorks engineers automate BOM generation, PDF exports, batch file conversion and more.',
    url: 'https://metamechsolutions.com/about',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/about' },
};

export default function AboutPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'About', item: 'https://metamechsolutions.com/about' },
    ],
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MetaMech Solutions',
    url: 'https://metamechsolutions.com',
    logo: 'https://metamechsolutions.com/metamech-logo.png',
    description: 'Ireland-based engineering automation company building desktop tools for SolidWorks engineers.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IE',
    },
    sameAs: [],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={organizationSchema} />

      <main className="min-h-screen bg-[#0a1628] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumbs items={[{ name: 'About' }]} />

          {/* Hero */}
          <div className="mb-12">
            <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              About <span className="text-teal-400">MetaMech Solutions</span>
            </h1>
          </div>

          {/* SolidWorks Automation, Built in Ireland */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              SolidWorks Automation, Built in Ireland
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              MetaMech Solutions is an engineering automation company based in <strong className="text-white">Ireland</strong>. We build desktop software that helps SolidWorks engineers eliminate repetitive, manual work — so they can focus on what they were hired to do: design.
            </p>
            <p className="text-gray-300 mb-0 leading-relaxed">
              Our flagship product, <strong className="text-white">MetaMech</strong>, is a VB.NET desktop application that automates the tasks SolidWorks engineers perform every day: BOM generation, PDF batch export, STEP and DXF conversion, drawing renumbering, and property management. No macros. No scripting. Just reliable tools that work.
            </p>
          </div>

          {/* Our Story */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Our Story
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              MetaMech started with a simple frustration. Engineers in Ireland — and everywhere else — were spending hours on tasks that should take minutes. Exporting 50 drawings to PDF. Rebuilding a bill of materials in Excel. Renumbering sheets after a design change. Copying the same custom properties across hundreds of parts.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              These aren&apos;t engineering problems. They&apos;re data-handling problems. And yet mechanical designers were losing entire afternoons to them, week after week.
            </p>
            <p className="text-gray-300 mb-0 leading-relaxed">
              We founded MetaMech Solutions in Ireland to fix that. Not with expensive enterprise platforms or complex APIs — but with a focused desktop tool that any SolidWorks engineer can install, open, and use immediately.
            </p>
          </div>

          {/* Our Mission */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Our Mission
            </h2>
            <p className="text-teal-400 font-bold text-lg mb-4">
              Make SolidWorks automation accessible to every engineer.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Not every company has a dedicated automation team. Not every engineer knows VBA. Not every design department can justify a six-figure PLM rollout.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              MetaMech exists for the engineers in between — the ones who know their workflow could be faster but don&apos;t have the programming skills or the budget to make it happen. We believe automation should be a standard part of every mechanical designer&apos;s toolkit, not a luxury reserved for large enterprises.
            </p>
            <p className="text-gray-300 mb-0 leading-relaxed">
              That belief drives everything we build from our base here in Ireland.
            </p>
          </div>

          {/* What We Build */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              What We Build
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              MetaMech is a single desktop application with five core capabilities:
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-teal-400 mt-1 flex-shrink-0">✅</span>
                <span><Link href="/features#bom" className="text-teal-400 hover:text-teal-300 underline font-bold">BOM Generation</Link> — Extract complete bills of materials from assemblies and export them to formatted Excel files.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-teal-400 mt-1 flex-shrink-0">✅</span>
                <span><Link href="/features#pdf" className="text-teal-400 hover:text-teal-300 underline font-bold">PDF Merge &amp; Index</Link> — Batch-export drawings to PDF, merge them into a single document, and generate a clickable index.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-teal-400 mt-1 flex-shrink-0">✅</span>
                <span><Link href="/features#export" className="text-teal-400 hover:text-teal-300 underline font-bold">STEP &amp; DXF Batch Export</Link> — Convert entire assemblies to STEP and DXF with automated file naming and folder organisation.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-teal-400 mt-1 flex-shrink-0">✅</span>
                <span><Link href="/features#renumber" className="text-teal-400 hover:text-teal-300 underline font-bold">Drawing Renumbering</Link> — Renumber drawing sheets and views in bulk with automatic reference updates.</span>
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-teal-400 mt-1 flex-shrink-0">✅</span>
                <span><Link href="/features#properties" className="text-teal-400 hover:text-teal-300 underline font-bold">Template &amp; Properties Sync</Link> — Push property templates across files to keep part numbers, descriptions, and revision fields consistent.</span>
              </li>
            </ul>
            <p className="text-gray-300 mb-0 leading-relaxed">
              Every feature is designed for speed, reliability, and zero coding. <Link href="/features" className="text-teal-400 hover:text-teal-300 underline">Explore all features →</Link>
            </p>
          </div>

          {/* Why Ireland? */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MapPin size={24} className="text-teal-400" />
              <h2 className="font-orbitron text-2xl font-bold text-white mt-0 mb-0">
                Why Ireland?
              </h2>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Ireland has a long history in mechanical engineering, precision manufacturing, and medical device design. Some of the world&apos;s most demanding engineering companies operate here — and they expect tools that work under pressure.
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Building MetaMech in Ireland means we understand the workflows, standards, and expectations of engineers in regulated industries. Our proximity to Ireland&apos;s thriving engineering and manufacturing sector keeps us grounded in real-world problems, not theoretical ones.
            </p>
            <p className="text-gray-300 mb-0 leading-relaxed">
              We&apos;re proud to be an Irish company contributing to the mechanical design community in Ireland and beyond.
            </p>
          </div>

          {/* Our Values */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-6 mt-0">
              Our Values
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Users size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Engineers first.</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">We build for the people who use SolidWorks every day. Not IT departments. Not procurement teams. Engineers.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Simple beats clever.</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">A tool that works in 30 seconds is worth more than one that takes a week to configure.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Reliability is non-negotiable.</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">When you press a button in MetaMech, it should do exactly what you expect, every time. Our engineers test against real assemblies, real drawings, and real edge cases.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <Heart size={20} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-1">Automation for everyone.</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">You shouldn&apos;t need to write code to automate your work. Period.</p>
                </div>
              </div>
            </div>
          </div>

          {/* The Team */}
          <div className="glass-card p-6 sm:p-8 mb-8">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              The Team
            </h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              MetaMech Solutions is a small, focused team of engineers and developers based in Ireland. We combine hands-on mechanical design experience with software development skills — because you can&apos;t build a good SolidWorks tool without understanding SolidWorks.
            </p>
            <p className="text-gray-300 mb-0 leading-relaxed">
              We&apos;re passionate about engineering and about removing the friction that stops engineers from doing their best work. Every feature we ship comes from real conversations with real users solving real problems.
            </p>
          </div>

          {/* Get in Touch */}
          <div className="glass-card p-6 sm:p-8 text-center">
            <h2 className="font-orbitron text-2xl font-bold text-white mb-4 mt-0">
              Get in Touch
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Whether you&apos;re an engineer looking to automate your SolidWorks workflow, a company evaluating tools for your design team, or just curious about what MetaMech can do — we&apos;d love to hear from you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
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
                See All Features <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-teal-400/50 text-teal-400 hover:bg-teal-400 hover:text-[#0a1628] font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                Contact Us <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <p className="text-gray-500 text-sm text-center mt-8 italic">
            MetaMech Solutions — SolidWorks automation from Ireland, built for engineers everywhere.
          </p>
        </div>
      </main>
    </>
  );
}
