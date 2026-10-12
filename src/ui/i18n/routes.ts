import { SUPPORTED_LOCALES, type Locale } from '../../domain/shared/locale';

/*
 * Public URLs in one place (ADR 0012). Spanish lives at the root and English under /en. Every
 * page that exists in one language exists in the other, so a route always has both alternates:
 * the language switch, hreflang and the sitemap all read from here.
 */

export type PageRoute =
  | { readonly page: 'home' }
  | { readonly page: 'privacy' }
  | { readonly page: 'project'; readonly slug: string };

const PATHS: Readonly<Record<Locale, { home: string; privacy: string; projects: string }>> = {
  es: { home: '/', privacy: '/privacidad', projects: '/proyectos' },
  en: { home: '/en', privacy: '/en/privacy', projects: '/en/projects' },
};

export const pathFor = (locale: Locale, route: PageRoute): string => {
  const paths = PATHS[locale];
  switch (route.page) {
    case 'home':
      return paths.home;
    case 'privacy':
      return paths.privacy;
    case 'project':
      return `${paths.projects}/${route.slug}`;
  }
};

/** The same page in every supported language, keyed by locale. */
export const alternatesFor = (route: PageRoute): Readonly<Record<Locale, string>> =>
  Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, pathFor(locale, route)])) as Record<
    Locale,
    string
  >;

export const homePath = (locale: Locale): string => pathFor(locale, { page: 'home' });

export const privacyPath = (locale: Locale): string => pathFor(locale, { page: 'privacy' });

export const projectPath = (locale: Locale, slug: string): string =>
  pathFor(locale, { page: 'project', slug });

/** A section of the home page, from any page: `/#projects` or `/en#projects`. */
export const homeSectionPath = (locale: Locale, section: string): string =>
  `${PATHS[locale].home}#${section}`;

export const projectsListPath = (locale: Locale): string => homeSectionPath(locale, 'projects');

/** The Open Graph card generated for a page (scripts/generate-og.mjs writes the same paths). */
export const ogImagePath = (locale: Locale, route: PageRoute): string =>
  `/og/${locale}/${route.page === 'project' ? `projects/${route.slug}` : route.page}.png`;
