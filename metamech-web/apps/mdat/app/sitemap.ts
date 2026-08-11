import type { MetadataRoute } from 'next';

/**
 * Current production canonical host remains metamechsolutions.com until
 * an approved domain migration moves MDAT to mdat.metamechsolutions.com.
 * Override with NEXT_PUBLIC_SITE_URL only for isolated preview experiments —
 * do not attach production DNS from this workspace.
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://metamechsolutions.com';

const staticRoutes = [
  '',
  '/tools',
  '/tools/bom',
  '/tools/pdf-merge',
  '/tools/file-export',
  '/services',
  '/industries',
  '/pricing',
  '/contact',
  '/download',
  '/about',
  '/solidworks-macros',
  '/solidworks-design-automation',
  '/privacy-policy',
  '/terms',
  '/blog',
  '/blog/solidworks-bom-automation-guide',
  '/blog/merge-solidworks-drawings-pdf',
  '/blog/batch-export-step-dxf-solidworks',
  '/blog/solidworks-automation-tools-comparison',
  '/blog/reduce-engineering-errors-solidworks',
  '/blog/solidworks-macros-guide',
  '/blog/mechanical-design-consultant-ireland',
  '/blog/solidworks-add-ins-productivity',
  '/blog/cad-automation-engineering-teams',
  '/blog/solidworks-drawing-management-tips',
  // Previously missing from sitemap (pages exist)
  '/blog/best-solidworks-macros-2026',
  '/blog/mechanical-design-ireland-2026',
  '/blog/solidworks-automation-guide-2026',
  '/blog/solidworks-macro-vs-automation-tool',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith('/blog') ? 'monthly' : route === '' || route === '/pricing' ? 'weekly' : 'monthly',
    priority:
      route === ''
        ? 1
        : route === '/pricing' || route === '/tools' || route === '/download'
          ? 0.9
          : route.startsWith('/blog/')
            ? 0.7
            : 0.8,
  }));
}
