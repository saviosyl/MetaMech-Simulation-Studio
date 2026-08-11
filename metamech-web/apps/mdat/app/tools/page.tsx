import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Table, Files, FileOutput, Check, ArrowRight, Settings, Cog,
  Play, Download, Quote, Clock, AlertTriangle, Zap, BarChart3, Users
} from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import AnimatedToolsContent from '@/components/AnimatedToolsContent';

export const metadata: Metadata = {
  title: 'SolidWorks Automation Tools — BOM, PDF Merge, STEP Export | MetaMech',
  description:
    'Explore MetaMech SolidWorks automation tools: BOM generation in 30 seconds, PDF merge with auto index & bookmarks, batch STEP/DXF export. Free 3-day trial.',
  openGraph: {
    title: 'SolidWorks Automation Tools — BOM, PDF Merge, STEP Export | MetaMech',
    description: 'Explore MetaMech SolidWorks automation tools: BOM generation in 30 seconds, PDF merge with auto index, batch STEP/DXF export.',
    url: 'https://metamechsolutions.com/tools',
    images: [{ url: 'https://metamechsolutions.com/metamech-logo.png', width: 1200, height: 630, alt: 'MetaMech Solutions - SolidWorks Automation Tools' }],
  },
  alternates: { canonical: 'https://metamechsolutions.com/tools' },
};

const tools = [
  {
    icon: Table,
    title: 'BOM Automation',
    description:
      'Generate accurate Bills of Materials with custom templates and automatic formatting.',
    features: [
      'Custom Excel templates',
      'Automatic part number sequencing',
      'Multi-configuration support',
      'Real-time updates',
    ],
    href: '/tools/bom',
    color: 'cyan' as const,
  },
  {
    icon: Files,
    title: 'PDF Merge + Index',
    description:
      'Combine multiple drawings into a single PDF with automatic index generation and bookmarks.',
    features: [
      'Batch PDF merging',
      'Automatic index creation',
      'Clickable bookmarks',
      'Custom page numbering',
    ],
    href: '/tools/pdf-merge',
    color: 'gold' as const,
  },
  {
    icon: FileOutput,
    title: 'STEP / DXF Export',
    description:
      'Export multiple files in batch with consistent naming and folder organization.',
    features: [
      'Batch file export',
      'Custom naming conventions',
      'Automatic folder structure',
      'Format validation',
    ],
    href: '/tools/file-export',
    color: 'cyan' as const,
  },
];

const howItWorksSteps = [
  {
    number: '01',
    title: 'Select Assembly',
    description: 'Open your SolidWorks assembly and choose the components you want to process.',
    icon: Settings,
  },
  {
    number: '02',
    title: 'Configure Settings',
    description: 'Set your templates, naming conventions, export formats, and output preferences.',
    icon: Cog,
  },
  {
    number: '03',
    title: 'Run Automation',
    description: 'Click run and let MetaMech process your entire assembly in seconds.',
    icon: Play,
  },
  {
    number: '04',
    title: 'Export Results',
    description: 'Get perfectly formatted outputs — BOMs, PDFs, STEP files — ready to share.',
    icon: Download,
  },
];

const comparisonRows = [
  { task: 'BOM Generation', manual: '2-4 hours per assembly', automated: 'Under 30 seconds' },
  { task: 'PDF Drawing Package', manual: '1-2 hours with manual indexing', automated: '1 click, auto-indexed' },
  { task: 'STEP/DXF Export', manual: '30 min+ opening each file', automated: 'Batch export in seconds' },
  { task: 'Error Rate', manual: '5-15% missed parts or typos', automated: '< 0.1% with validation' },
  { task: 'Consistency', manual: 'Varies by person and mood', automated: '100% consistent every time' },
  { task: 'Revision Updates', manual: 'Re-do from scratch', automated: 'Automatic refresh' },
];

const testimonials = [
  {
    quote: 'MetaMech cut our drawing package time from 3 hours to 5 minutes. The PDF merge with auto-index alone paid for itself in the first week.',
    name: 'Lead Mechanical Engineer',
    role: 'Automation Industry',
  },
  {
    quote: "We used to lose half a day every release just exporting STEP files and building BOMs. Now it's a single click before lunch. Game changer.",
    name: 'Design Team Lead',
    role: 'Medical Devices',
  },
  {
    quote: 'The accuracy improvement alone justified the purchase. We caught zero BOM errors in the last 6 months — previously it was 2-3 per release.',
    name: 'Engineering Manager',
    role: 'Industrial Equipment',
  },
];

export default function ToolsPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://metamechsolutions.com/tools' },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden pt-[100px]">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <Breadcrumbs items={[{ name: 'Tools' }]} />

          <div className="text-center mb-16">
            <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              SOLIDWORKS <span className="text-gradient-teal">AUTOMATION TOOLS</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Streamline your engineering workflow with powerful automation tools designed specifically for SolidWorks.
            </p>
          </div>

          <AnimatedToolsContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" style={{ perspective: '800px' }}>
            {tools.map((tool, index) => (
              <Link
                key={index}
                href={tool.href}
                data-animate="tool-card"
                className="group relative glass-card p-6 sm:p-8 transition-all duration-300 hover:-translate-y-3 hover:shadow-card-hover block card-tilt"
                style={{ marginTop: index === 1 ? '40px' : '0' }}
              >
                <div
                  className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    tool.color === 'cyan' ? 'shadow-glow-teal' : 'shadow-glow-gold'
                  }`}
                />

                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                    tool.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gold/20 text-gold'
                  }`}
                >
                  <tool.icon size={28} />
                </div>

                <h2 className="font-orbitron text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  {tool.title}
                </h2>

                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{tool.description}</p>

                <ul className="space-y-2 mb-6">
                  {tool.features.map((feature, fIndex) => (
                    <li
                      key={fIndex}
                      className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-gray-400 transition-colors"
                    >
                      <Check
                        size={14}
                        className={`flex-shrink-0 ${tool.color === 'cyan' ? 'text-cyan-400' : 'text-gold'}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <span
                  className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:gap-3 ${
                    tool.color === 'cyan' ? 'text-cyan-400' : 'text-gold'
                  }`}
                >
                  Learn More <ArrowRight size={16} />
                </span>

                <div
                  className={`absolute inset-0 rounded-2xl border border-transparent group-hover:border-opacity-100 transition-all duration-300 pointer-events-none ${
                    tool.color === 'cyan' ? 'group-hover:border-cyan-500/50' : 'group-hover:border-gold/50'
                  }`}
                />
              </Link>
            ))}
          </div>
          </AnimatedToolsContent>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              HOW IT <span className="text-gradient-teal">WORKS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              From assembly to output in four simple steps. No coding required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="relative group">
                {/* Connector line */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[calc(100%-20%)] h-[2px] bg-gradient-to-r from-cyan-500/40 to-cyan-500/10" />
                )}
                <div className="glass-card p-6 text-center hover:-translate-y-2 transition-all duration-300">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all duration-300">
                    <step.icon size={24} className="text-cyan-400" />
                  </div>
                  <div className="font-orbitron text-3xl font-bold text-cyan-500/30 mb-2">{step.number}</div>
                  <h3 className="font-orbitron text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After Comparison */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[150px] -translate-y-1/2" />
        </div>
        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              BEFORE VS AFTER <span className="text-gradient-gold">METAMECH</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              See the difference automation makes in your daily engineering workflow.
            </p>
          </div>

          <div className="glass-card overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 border-b border-white/10">
              <div className="p-4 sm:p-6 font-orbitron text-sm font-bold text-gray-400">Task</div>
              <div className="p-4 sm:p-6 font-orbitron text-sm font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Manual Workflow
              </div>
              <div className="p-4 sm:p-6 font-orbitron text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Zap size={16} /> With MetaMech
              </div>
            </div>
            {/* Table Rows */}
            {comparisonRows.map((row, index) => (
              <div
                key={index}
                className={`grid grid-cols-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                  index % 2 === 0 ? 'bg-white/[0.01]' : ''
                }`}
              >
                <div className="p-4 sm:p-6 text-sm font-medium text-white">{row.task}</div>
                <div className="p-4 sm:p-6 text-sm text-gray-500">{row.manual}</div>
                <div className="p-4 sm:p-6 text-sm text-cyan-400 font-medium">{row.automated}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-navy-light" />
        <div className="relative z-10 max-w-7xl xl:max-w-8xl 2xl:max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-16">
            <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
              TRUSTED BY <span className="text-gradient-teal">ENGINEERING TEAMS</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              Hear from engineers who transformed their workflows with MetaMech.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="glass-card p-6 sm:p-8 group hover:-translate-y-2 transition-all duration-300 hover:border-cyan-500/30"
              >
                <Quote size={32} className="text-cyan-500/20 mb-4" />
                <p className="text-gray-400 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-600/30 flex items-center justify-center">
                      <Users size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-gray-500 text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-orbitron text-3xl sm:text-4xl font-bold text-white mb-4">
            READY TO <span className="text-gradient-gold text-shimmer">AUTOMATE</span>?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Start your free 3-day trial or view pricing. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/download" className="btn-primary flex items-center gap-2">
              <Download size={18} /> Download Free Trial
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
