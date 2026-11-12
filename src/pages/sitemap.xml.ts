import type { APIRoute } from 'astro';
import { siteConfig, withBase, hasValidSiteUrl } from '../config/site';

/**
 * Generador de sitemap.xml a partir de la URL configurada en siteConfig.url.
 */
const publicRoutes = [
  '',
  'aviso-legal/',
  'privacidad/',
  'avisos-de-terceros/',
];

export const GET: APIRoute = () => {
  if (!hasValidSiteUrl) {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`.trim();
    return new Response(emptyXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }

  const cleanSite = siteConfig.url.replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes
  .map((route) => {
    const loc = `${cleanSite}${withBase(`/${route}`)}`;
    const priority = route === '' ? '1.0' : '0.5';
    const changefreq = route === '' ? 'weekly' : 'monthly';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
