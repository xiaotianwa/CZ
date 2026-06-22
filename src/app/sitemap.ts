import type { MetadataRoute } from 'next';

function resolveSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (!raw) return 'http://localhost:3000';
  try {
    return new URL(raw).toString().replace(/\/$/, '');
  } catch {
    return 'http://localhost:3000';
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  const now = new Date();

  const routes = [
    '/',
    '/profile',
    '/search',
    '/fan-map',
    '/join',
    '/me',
    '/privacy',
    '/terms',
    '/login',
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
