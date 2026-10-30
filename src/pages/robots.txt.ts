import type { APIRoute } from 'astro';
import { siteConfig, withBase, hasValidSiteUrl } from '../config/site';

/**
 * Generador dinámico de robots.txt gobernado por PUBLIC_LAUNCH (siteConfig.isLaunch).
 *
 * - Si isLaunch es false (por defecto): bloquea todos los rastreadores con Disallow: /
 * - Si isLaunch es true: habilita el rastreo Allow: / y referencia el Sitemap solo si hay URL válida.
 */
export const GET: APIRoute = () => {
  let body = '';
  if (!siteConfig.isLaunch) {
    body = `User-agent: *\nDisallow: /\n`;
  } else if (hasValidSiteUrl) {
    const cleanUrl = siteConfig.url.replace(/\/+$/, '');
    body = `User-agent: *\nAllow: /\n\nSitemap: ${cleanUrl}${withBase('/sitemap.xml')}\n`;
  } else {
    body = `User-agent: *\nAllow: /\n`;
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
