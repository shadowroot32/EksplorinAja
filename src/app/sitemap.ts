import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return [
    {
      url: new URL('/', base).toString(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
