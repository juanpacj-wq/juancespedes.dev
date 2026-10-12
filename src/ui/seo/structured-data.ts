import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import { absoluteUrl, SITE } from '../site';

/*
 * schema.org JSON-LD for search engines (ADR 0012). Builders are pure so tests can check them;
 * the layout serializes them with `toJsonLd`. One Person is defined on the home page and every
 * other node points to it by @id, so search engines see a single author across both languages.
 */

export type JsonLd = Readonly<Record<string, unknown>>;

const PERSON_ID = `${SITE.url}/#person`;
const WEBSITE_ID = `${SITE.url}/#website`;

const LANGUAGE_TAG: Readonly<Record<Locale, string>> = { es: 'es-CO', en: 'en-US' };

export interface PersonFacts {
  readonly locale: Locale;
  readonly name: string;
  readonly jobTitle: string;
  readonly description: string;
  readonly homeUrl: string;
  readonly alumniOf: readonly string[];
  readonly knowsAbout: readonly string[];
}

/** Home page: the person and the website, as one graph. */
export const homeGraph = (facts: PersonFacts): JsonLd => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: facts.name,
      url: absoluteUrl(facts.homeUrl),
      jobTitle: facts.jobTitle,
      description: facts.description,
      email: `mailto:${SITE.email}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: SITE.locality,
        addressCountry: SITE.country,
      },
      alumniOf: facts.alumniOf.map((name) => ({ '@type': 'CollegeOrUniversity', name })),
      knowsAbout: [...facts.knowsAbout],
      sameAs: [SITE.githubUrl, SITE.linkedinUrl],
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: absoluteUrl(facts.homeUrl),
      name: facts.name,
      inLanguage: LANGUAGE_TAG[facts.locale],
      author: { '@id': PERSON_ID },
    },
  ],
});

export interface ProjectPageFacts {
  readonly project: Project;
  readonly authorName: string;
  readonly url: string;
  readonly image: string;
  readonly homeName: string;
  readonly homeUrl: string;
  readonly projectsName: string;
  readonly projectsUrl: string;
}

/** A project page: the work itself, and the breadcrumb that leads to it. */
export const projectGraph = ({
  project,
  authorName,
  url,
  image,
  homeName,
  homeUrl,
  projectsName,
  projectsUrl,
}: ProjectPageFacts): JsonLd => ({
  '@context': 'https://schema.org',
  '@graph': [
    // The full Person lives on the home page; this node gives the author a name on every page.
    { '@type': 'Person', '@id': PERSON_ID, name: authorName, url: absoluteUrl(homeUrl) },
    {
      '@type': 'CreativeWork',
      '@id': `${absoluteUrl(url)}#work`,
      name: project.title,
      headline: project.title,
      description: project.summary,
      url: absoluteUrl(url),
      image: absoluteUrl(image),
      inLanguage: LANGUAGE_TAG[project.locale],
      dateCreated: project.period.start,
      author: { '@id': PERSON_ID },
      creator: { '@id': PERSON_ID },
      keywords: project.stack.join(', '),
      ...(project.links.length > 0 && { sameAs: project.links.map((link) => link.url) }),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeName, item: absoluteUrl(homeUrl) },
        { '@type': 'ListItem', position: 2, name: projectsName, item: absoluteUrl(projectsUrl) },
        { '@type': 'ListItem', position: 3, name: project.title, item: absoluteUrl(url) },
      ],
    },
  ],
});

/**
 * Serializes for a `<script type="application/ld+json">`. `<` is escaped so content can never
 * close the script element early.
 */
export const toJsonLd = (data: JsonLd): string => JSON.stringify(data).replace(/</g, '\\u003c');
