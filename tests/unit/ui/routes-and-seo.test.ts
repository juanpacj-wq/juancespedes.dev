import { describe, expect, it } from 'vitest';

import {
  alternatesFor,
  homeSectionPath,
  ogImagePath,
  pathFor,
  projectPath,
  type PageRoute,
} from '../../../src/ui/i18n/routes';
import { buildSitemap } from '../../../src/ui/seo/sitemap';
import { createNote } from '../../../src/domain/writing/note';
import { homeGraph, noteGraph, projectGraph, toJsonLd } from '../../../src/ui/seo/structured-data';
import { caseStudyContent, project } from '../../support/project-builders';

describe('route table', () => {
  it.each([
    [{ page: 'home' }, '/', '/en'],
    [{ page: 'privacy' }, '/privacidad', '/en/privacy'],
    [
      { page: 'project', slug: 'plant-telemetry' },
      '/proyectos/plant-telemetry',
      '/en/projects/plant-telemetry',
    ],
    [{ page: 'now' }, '/ahora', '/en/now'],
    [{ page: 'notes' }, '/notas', '/en/notes'],
    [{ page: 'note', slug: 'strict-csp' }, '/notas/strict-csp', '/en/notes/strict-csp'],
  ] satisfies [PageRoute, string, string][])('maps %o in both languages', (route, es, en) => {
    expect(pathFor('es', route)).toBe(es);
    expect(pathFor('en', route)).toBe(en);
    expect(alternatesFor(route)).toEqual({ es, en });
  });

  it('builds links to home sections without a trailing slash in English', () => {
    expect(homeSectionPath('es', 'contact')).toBe('/#contact');
    expect(homeSectionPath('en', 'contact')).toBe('/en#contact');
    expect(projectPath('en', 'x')).toBe('/en/projects/x');
  });

  it('names one Open Graph card per page and language', () => {
    expect(ogImagePath('es', { page: 'home' })).toBe('/og/es/home.png');
    expect(ogImagePath('en', { page: 'project', slug: 'x' })).toBe('/og/en/projects/x.png');
    expect(ogImagePath('es', { page: 'note', slug: 'y' })).toBe('/og/es/notes/y.png');
    expect(ogImagePath('en', { page: 'now' })).toBe('/og/en/now.png');
  });
});

describe('sitemap', () => {
  const xml = buildSitemap([{ page: 'home' }, { page: 'project', slug: 'a&b' }]);

  it('lists every page once per language with reciprocal alternates', () => {
    expect(xml.match(/<url>/g)).toHaveLength(4);
    expect(xml).toContain('<loc>https://juancespedes.dev/en</loc>');
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://juancespedes.dev/"/>',
    );
  });

  it('escapes XML special characters', () => {
    expect(xml).toContain('/proyectos/a&amp;b');
    expect(xml).not.toContain('a&b');
  });
});

describe('structured data', () => {
  it('describes the person and the website on the home page', () => {
    const graph = homeGraph({
      locale: 'en',
      name: 'Juan Céspedes',
      jobTitle: 'Systems engineer',
      description: 'Full-stack, data and automation.',
      homeUrl: '/en',
      alumniOf: ['Universidad del Norte'],
      knowsAbout: ['React', 'SQL Server'],
    });
    expect(graph).toMatchObject({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': 'https://juancespedes.dev/#person',
          url: 'https://juancespedes.dev/en',
          alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'Universidad del Norte' }],
          sameAs: ['https://github.com/juanpacj-wq', 'https://www.linkedin.com/in/juan-cespedesjc'],
        },
        { '@type': 'WebSite', inLanguage: 'en-US' },
      ],
    });
  });

  it('describes a project as a creative work with its breadcrumb', () => {
    const work = project(
      'logbook',
      caseStudyContent({ links: [{ label: 'Site', url: 'https://example.com' }] }),
      'es',
    );
    const graph = projectGraph({
      project: work,
      authorName: 'Juan Céspedes',
      url: '/proyectos/logbook',
      image: '/og/es/projects/logbook.png',
      homeName: 'Inicio',
      homeUrl: '/',
      projectsName: 'Proyectos',
      projectsUrl: '/#projects',
    });
    expect(graph['@graph']).toMatchObject([
      { '@type': 'Person', name: 'Juan Céspedes' },
      {
        '@type': 'CreativeWork',
        name: work.title,
        inLanguage: 'es-CO',
        dateCreated: '2026-03',
        image: 'https://juancespedes.dev/og/es/projects/logbook.png',
        keywords: 'React, Node.js',
        sameAs: ['https://example.com'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { position: 1, item: 'https://juancespedes.dev/' },
          { position: 2, item: 'https://juancespedes.dev/#projects' },
          { position: 3, item: 'https://juancespedes.dev/proyectos/logbook' },
        ],
      },
    ]);
  });

  it('omits sameAs when a project has no public links', () => {
    const graph = projectGraph({
      project: project('logbook'),
      authorName: 'Juan',
      url: '/en/projects/logbook',
      image: '/og/en/projects/logbook.png',
      homeName: 'Home',
      homeUrl: '/en',
      projectsName: 'Projects',
      projectsUrl: '/en#projects',
    });
    expect(JSON.stringify(graph)).not.toContain('sameAs');
  });

  it('describes a note as a blog post, modified when it was updated', () => {
    const note = createNote(
      { slug: 'strict-csp', locale: 'en' },
      {
        title: 'A strict CSP',
        summary: 'How.',
        published: '2026-10-12',
        updated: null,
        tags: ['security', 'astro'],
        status: 'published',
      },
    );
    if (!note.ok) throw new Error('invalid test note');
    const graph = noteGraph({
      note: note.value,
      authorName: 'Juan Céspedes',
      url: '/en/notes/strict-csp',
      image: '/og/en/notes/strict-csp.png',
      homeUrl: '/en',
    });
    expect(graph['@graph']).toMatchObject([
      { '@type': 'Person', name: 'Juan Céspedes' },
      {
        '@type': 'BlogPosting',
        headline: 'A strict CSP',
        inLanguage: 'en-US',
        datePublished: '2026-10-12',
        dateModified: '2026-10-12',
        keywords: 'security, astro',
        mainEntityOfPage: 'https://juancespedes.dev/en/notes/strict-csp',
      },
    ]);
  });

  it('cannot close the script element it is embedded in', () => {
    expect(toJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});
