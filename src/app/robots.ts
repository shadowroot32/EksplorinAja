import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl().toString().replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/review', '/subjects', '/library', '/settings', '/study/', '/api/', '/share/'],
    },
    sitemap: siteUrl + '/sitemap.xml',
    host: siteUrl,
  };
}
