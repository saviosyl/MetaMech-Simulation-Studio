import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ArrowRight, Calendar, User } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Blog — SolidWorks Automation Tips & Engineering Productivity',
  description:
    'Expert articles on SolidWorks automation, BOM management, batch export, PDF merging, and engineering productivity. Tips and guides from the MetaMech Engineering Team.',
  openGraph: {
    title: 'Blog — SolidWorks Automation Tips & Engineering Productivity',
    description:
      'Expert articles on SolidWorks automation, BOM management, batch export, PDF merging, and engineering productivity.',
    url: 'https://metamechsolutions.com/blog',
    type: 'website',
  },
  alternates: { canonical: 'https://metamechsolutions.com/blog' },
};

const articles = [
  {
    title: 'The Complete Guide to SolidWorks Automation in 2026',
    href: '/blog/solidworks-automation-guide-2026',
    description:
      'Learn everything about SolidWorks automation — from macros and API scripting to dedicated tools like MetaMech. Boost productivity, reduce errors, and save hundreds of engineering hours.',
    date: 'February 12, 2026',
    readTime: '12 min read',
  },
  {
    title: '15 Best SolidWorks Macros Every Engineer Needs in 2026',
    href: '/blog/best-solidworks-macros-2026',
    description:
      'Discover the 15 best SolidWorks macros for 2026 — from batch PDF export to BOM automation. Learn what each macro does, plus how MetaMech bundles them all into one powerful tool.',
    date: 'February 12, 2026',
    readTime: '14 min read',
  },
  {
    title: 'Mechanical Design in Ireland: Tools, Trends & Automation in 2026',
    href: '/blog/mechanical-design-ireland-2026',
    description:
      'Explore the state of mechanical design in Ireland in 2026 — key industries, emerging trends, and why Irish engineers are turning to design automation tools like MetaMech.',
    date: 'February 12, 2026',
    readTime: '13 min read',
  },
  {
    title: 'SolidWorks Macros vs Automation Tools: Which Should You Use?',
    href: '/blog/solidworks-macro-vs-automation-tool',
    description:
      'SolidWorks macros or a dedicated automation tool? Compare VBA macros vs tools like MetaMech — pros, cons, and when to use each.',
    date: 'February 12, 2026',
    readTime: '14 min read',
  },
  {
    title: 'How to Automate SolidWorks Bill of Materials: A Complete Guide',
    href: '/blog/solidworks-bom-automation-guide',
    description:
      'Learn how to eliminate manual BOM errors, save hours per project, and streamline your bill of materials workflow with automation.',
    date: 'February 3, 2026',
    readTime: '10 min read',
  },
  {
    title: 'How to Merge SolidWorks Drawings into One PDF with Auto Index',
    href: '/blog/merge-solidworks-drawings-pdf',
    description:
      'Combine multiple SolidWorks drawing sheets into a single indexed PDF with automatic bookmarks and table of contents.',
    date: 'February 5, 2026',
    readTime: '9 min read',
  },
  {
    title: 'Batch Export STEP & DXF Files from SolidWorks — Save Hours Every Week',
    href: '/blog/batch-export-step-dxf-solidworks',
    description:
      'Automate STEP and DXF exports from SolidWorks assemblies with proper naming conventions and folder structures.',
    date: 'February 7, 2026',
    readTime: '9 min read',
  },
  {
    title: 'Top SolidWorks Automation Tools in 2026: What Engineers Need to Know',
    href: '/blog/solidworks-automation-tools-comparison',
    description:
      'A comprehensive comparison of SolidWorks automation tools — from macros to add-ins to purpose-built solutions.',
    date: 'February 10, 2026',
    readTime: '11 min read',
  },
  {
    title: '5 Ways to Reduce Engineering Errors in SolidWorks with Automation',
    href: '/blog/reduce-engineering-errors-solidworks',
    description:
      'Discover the most common engineering errors in SolidWorks workflows and how automation eliminates each one.',
    date: 'February 12, 2026',
    readTime: '10 min read',
  },
  {
    title: 'SolidWorks Macros: The Complete Guide to Automating Your CAD Workflow',
    href: '/blog/solidworks-macros-guide',
    description:
      'Master SolidWorks macros and VBA macro automation to speed up your CAD workflow. Learn common macros, limitations, and better alternatives.',
    date: 'February 8, 2026',
    readTime: '10 min read',
  },
  {
    title: 'Mechanical Design Consulting Services — SolidWorks Experts in Ireland',
    href: '/blog/mechanical-design-consultant-ireland',
    description:
      'Professional mechanical design consultant services in Ireland. SolidWorks design services for concept design, FEA, prototyping, and production engineering.',
    date: 'February 8, 2026',
    readTime: '10 min read',
  },
  {
    title: 'Best SolidWorks Add-ins for Engineering Productivity in 2026',
    href: '/blog/solidworks-add-ins-productivity',
    description:
      'Discover the best SolidWorks add-ins and plugins for engineering productivity. Compare automation, simulation, and data management tools.',
    date: 'February 8, 2026',
    readTime: '11 min read',
  },
  {
    title: 'CAD Automation for Engineering Teams: A Practical Guide',
    href: '/blog/cad-automation-engineering-teams',
    description:
      'Learn how CAD automation and engineering automation tools save time and reduce errors. Practical guide to design automation for engineering teams.',
    date: 'February 8, 2026',
    readTime: '11 min read',
  },
  {
    title: 'SolidWorks Drawing & File Management: 7 Tips to Stay Organized',
    href: '/blog/solidworks-drawing-management-tips',
    description:
      'Master SolidWorks drawing management and file management with 7 practical tips for naming, revision control, and engineering document management.',
    date: 'February 8, 2026',
    readTime: '10 min read',
  },
];

export default function BlogPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://metamechsolutions.com' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://metamechsolutions.com/blog' },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'MetaMech Solutions Blog',
          description: 'SolidWorks automation tips, engineering productivity guides, and best practices.',
          url: 'https://metamechsolutions.com/blog',
          publisher: {
            '@type': 'Organization',
            name: 'MetaMech Solutions',
            url: 'https://metamechsolutions.com',
          },
        }}
      />

      <main className="min-h-screen bg-[#0a1628] pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Breadcrumbs items={[{ name: 'Blog' }]} />

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-sm mb-6">
              <BookOpen className="w-4 h-4" />
              Engineering Insights
            </div>
            <h1 className="font-orbitron text-4xl md:text-5xl font-bold text-white mb-4">
              SolidWorks Automation <span className="text-teal-400">Blog</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Expert articles on SolidWorks automation, BOM management, batch export workflows, and engineering
              productivity tips from the MetaMech team.
            </p>
          </div>

          <div className="grid gap-8">
            {articles.map((article) => (
              <Link key={article.href} href={article.href} className="group block">
                <article className="glass-card p-8 transition-all duration-300 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10">
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      MetaMech Engineering Team
                    </span>
                    <span>{article.readTime}</span>
                  </div>
                  <h2 className="font-orbitron text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-teal-400 transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-gray-300 mb-4">{article.description}</p>
                  <span className="inline-flex items-center gap-2 text-teal-400 font-semibold text-sm group-hover:gap-3 transition-all">
                    Read Article <ArrowRight className="w-4 h-4" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
