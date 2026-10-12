import type { Locale } from '../../domain/shared/locale';

/*
 * Public URLs in one place. Spanish lives at the root; English moves under /en in phase F5.
 * Slugs are shared by both languages, so switching language keeps the reader on the same project.
 */

const PROJECTS_BASE: Readonly<Record<Locale, string>> = { es: '/proyectos', en: '/en/projects' };
const HOME: Readonly<Record<Locale, string>> = { es: '/', en: '/en' };

export const homePath = (locale: Locale): string => HOME[locale];

export const projectsListPath = (locale: Locale): string =>
  `${locale === 'es' ? '' : HOME[locale]}/#projects`;

export const projectPath = (locale: Locale, slug: string): string =>
  `${PROJECTS_BASE[locale]}/${slug}`;
