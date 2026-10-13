import { SUPPORTED_LOCALES, type Locale } from '../../domain/shared/locale';

/*
 * Public URLs in one place (ADR 0012). Spanish lives at the root and English under /en. Every
 * page that exists in one language exists in the other, so a route always has both alternates:
 * the language switch, hreflang and the sitemap all read from here.
 */

export type PageRoute =
  | { readonly page: 'home' }
  | { readonly page: 'privacy' }
  | { readonly page: 'project'; readonly slug: string }
  | { readonly page: 'now' }
  | { readonly page: 'notes' }
  | { readonly page: 'note'; readonly slug: string };

interface LocalePaths {
  readonly home: string;
  readonly privacy: string;
  readonly projects: string;
  readonly now: string;
  readonly notes: string;
}

const PATHS: Readonly<Record<Locale, LocalePaths>> = {
  es: { home: '/', privacy: '/privacidad', projects: '/proyectos', now: '/ahora', notes: '/notas' },
  en: {
    home: '/en',
    privacy: '/en/privacy',
    projects: '/en/projects',
    now: '/en/now',
    notes: '/en/notes',
  },
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
    case 'now':
      return paths.now;
    case 'notes':
      return paths.notes;
    case 'note':
      return `${paths.notes}/${route.slug}`;
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

export const nowPath = (locale: Locale): string => pathFor(locale, { page: 'now' });

export const notesPath = (locale: Locale): string => pathFor(locale, { page: 'notes' });

export const notePath = (locale: Locale, slug: string): string =>
  pathFor(locale, { page: 'note', slug });

/** The Open Graph card generated for a page (scripts/generate-og.mjs writes the same paths). */
export const ogImagePath = (locale: Locale, route: PageRoute): string => {
  switch (route.page) {
    case 'project':
      return `/og/${locale}/projects/${route.slug}.png`;
    case 'note':
      return `/og/${locale}/notes/${route.slug}.png`;
    default:
      return `/og/${locale}/${route.page}.png`;
  }
};
