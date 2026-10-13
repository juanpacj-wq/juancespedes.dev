import { describe, expect, it } from 'vitest';

import { buildCorpus } from '../../../src/ui/chat/build-corpus';
import { linkify } from '../../../src/ui/chat/linkify';
import { dictionaryFor } from '../../../src/ui/i18n/dictionary';
import { architecture, caseStudyContent, project } from '../../support/project-builders';

describe('linkify', () => {
  it('turns site paths into links and leaves the rest as text', () => {
    expect(linkify('Mira /proyectos/plant-telemetry y /en/notes/strict-csp, o /ahora.')).toEqual([
      { kind: 'text', text: 'Mira ' },
      { kind: 'link', href: '/proyectos/plant-telemetry', label: '/proyectos/plant-telemetry' },
      { kind: 'text', text: ' y ' },
      { kind: 'link', href: '/en/notes/strict-csp', label: '/en/notes/strict-csp' },
      { kind: 'text', text: ', o ' },
      { kind: 'link', href: '/ahora', label: '/ahora' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('never links full URLs, other paths or look-alikes', () => {
    for (const text of [
      'https://evil.example/proyectos/x',
      'see /admin or /proyectosx/y',
      'a/proyectos/x',
      'javascript:alert(1)',
    ]) {
      expect(
        linkify(text).every((part) => part.kind === 'text'),
        text,
      ).toBe(true);
    }
  });

  it('links the English home and stops at the end of the path', () => {
    expect(linkify('Visit /en.')).toEqual([
      { kind: 'text', text: 'Visit ' },
      { kind: 'link', href: '/en', label: '/en' },
      { kind: 'text', text: '.' },
    ]);
  });
});

describe('buildCorpus', () => {
  const t = dictionaryFor('es');
  const logbook = project(
    'operations-logbook',
    caseStudyContent({
      title: 'Bitácora',
      metrics: [{ value: '1.400+', label: 'pruebas', source: 'suites' }],
      links: [{ label: 'Sitio', url: 'https://example.com' }],
      responsibilities: ['Diseñé el modelo'],
      architecture: architecture(),
      decisions: [{ title: 'Turnos', rationale: 'Historial inmutable', alternatives: ['Eventos'] }],
    }),
    'es',
  );

  const corpus = buildCorpus({
    t,
    locale: 'es',
    email: 'me@example.com',
    profile: {
      experience: [],
      education: [],
      credentials: [],
      services: [
        {
          title: 'Web',
          summary: 'Apps.',
          deliverables: ['Código'],
          price: { from: 6000000, scope: 'Un módulo' },
          featured: true,
        },
      ],
      process: [{ title: 'Conversación', description: 'Hablamos.' }],
      currency: 'COP',
      pricing: 'Cotización a partir del requerimiento.',
    },
    projects: [logbook],
    notes: [],
    now: { updated: '2026-10-12' as never, sections: [{ title: 'Trabajo', items: ['Operar'] }] },
  });

  it('includes the page path, figures with sources, decisions and the now page', () => {
    for (const fragment of [
      '### Bitácora',
      'Página: /proyectos/operations-logbook',
      '1.400+: pruebas (fuente: suites)',
      'Turnos. Historial inmutable (descartado: Eventos)',
      'Enlaces públicos: Sitio https://example.com',
      'Precio: Cotización a partir del requerimiento.',
      '## Ahora (/ahora, actualizado el 2026-10-12)',
      'Correo de contacto: me@example.com',
    ]) {
      expect(corpus).toContain(fragment);
    }
    expect(corpus).toMatch(/Desde \$\s6\.000\.000 COP \(Un módulo\)/);
  });

  it('is deterministic, so the prompt cache can reuse it', () => {
    expect(
      buildCorpus({
        t,
        locale: 'es',
        email: 'me@example.com',
        profile: {
          experience: [],
          education: [],
          credentials: [],
          services: [],
          process: [],
          currency: 'COP',
          pricing: 'x',
        },
        projects: [],
        notes: [],
        now: { updated: '2026-10-12' as never, sections: [] },
      }),
    ).toBe(
      buildCorpus({
        t,
        locale: 'es',
        email: 'me@example.com',
        profile: {
          experience: [],
          education: [],
          credentials: [],
          services: [],
          process: [],
          currency: 'COP',
          pricing: 'x',
        },
        projects: [],
        notes: [],
        now: { updated: '2026-10-12' as never, sections: [] },
      }),
    );
  });
});
