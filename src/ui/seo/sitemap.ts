import { SUPPORTED_LOCALES } from '../../domain/shared/locale';
import { alternatesFor, type PageRoute } from '../i18n/routes';
import { absoluteUrl } from '../site';

/*
 * sitemap.xml with every page in every language. Each <url> lists its alternates (and Spanish as
 * x-default), the format Google documents for bilingual sites. Pages without a route (design
 * system, 404) are left out on purpose.
 */

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const buildSitemap = (routes: readonly PageRoute[]): string => {
  const urls = routes.flatMap((route) => {
    const alternates = alternatesFor(route);
    const links = [
      ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: locale, href: alternates[locale] })),
      { hreflang: 'x-default', href: alternates.es },
    ]
      .map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(absoluteUrl(href))}"/>`,
      )
      .join('\n');
    return SUPPORTED_LOCALES.map(
      (locale) =>
        `  <url>\n    <loc>${escapeXml(absoluteUrl(alternates[locale]))}</loc>\n${links}\n  </url>`,
    );
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
};
