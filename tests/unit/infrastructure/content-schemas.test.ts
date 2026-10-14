import { describe, expect, it } from 'vitest';

import {
  InvalidProjectContentError,
  toProject,
} from '../../../src/infrastructure/content/project-mapper';
import {
  headlineMetricSchema,
  projectFrontmatterSchema,
  technologySchema,
} from '../../../src/infrastructure/content/schemas';

const minimalCaseStudy = {
  kind: 'case-study',
  title: 'Logbook',
  summary: 'Real-time logbook.',
  role: 'Engineer',
  period: { start: '2026-03', end: null },
  capabilities: ['backend'],
  stack: ['Node.js'],
  confidentiality: 'anonymized',
  story: {
    hook: 'Every shift ended with someone copying cells by hand.',
    shifts: [{ before: 'One workbook per shift', after: 'One shared live record' }],
  },
  problem: 'Excel logbooks.',
  constraints: ['Shifts cross midnight'],
  decisions: [{ title: 'Shifts as entities', rationale: 'History is immutable' }],
  architecture: {
    summary: 'Browsers call an API backed by SQL Server.',
    layers: [
      { name: 'Clients', nodes: [{ id: 'browser', label: 'Browser' }] },
      { name: 'Services', nodes: [{ id: 'api', label: 'API' }] },
    ],
  },
  outcomes: ['Shift handover moved to the app.'],
  lessons: ['Model the shift first.'],
};

describe('projectFrontmatterSchema', () => {
  it('applies safe defaults: draft, not featured, no links or metrics', () => {
    const parsed = projectFrontmatterSchema.parse(minimalCaseStudy);
    expect(parsed).toMatchObject({
      status: 'draft',
      featured: false,
      order: 100,
      metrics: [],
      links: [],
      responsibilities: [],
      architecture: { flows: [] },
    });
  });

  it('rejects unknown keys, so typos never pass silently', () => {
    const result = projectFrontmatterSchema.safeParse({ ...minimalCaseStudy, featurd: true });
    expect(result.success).toBe(false);
  });

  it('rejects unknown kinds and capabilities', () => {
    expect(projectFrontmatterSchema.safeParse({ ...minimalCaseStudy, kind: 'blog' }).success).toBe(
      false,
    );
    expect(
      projectFrontmatterSchema.safeParse({ ...minimalCaseStudy, capabilities: ['marketing'] })
        .success,
    ).toBe(false);
  });

  it('runs the domain rules inside the schema', () => {
    const result = projectFrontmatterSchema.safeParse({
      ...minimalCaseStudy,
      period: { start: '2026-05', end: '2026-01' },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'start must not be after end',
    );
  });

  it('reports architecture issues at their full path', () => {
    const result = projectFrontmatterSchema.safeParse({
      ...minimalCaseStudy,
      architecture: {
        ...minimalCaseStudy.architecture,
        flows: [{ from: 'browser', to: 'database', label: 'SQL' }],
      },
    });
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'architecture.flows[0].to',
    ]);
  });

  it('keeps the plain-language story short: one hook and one to four changes', () => {
    const shift = { before: 'By hand', after: 'From the data' };
    const withShifts = (count: number) =>
      projectFrontmatterSchema.safeParse({
        ...minimalCaseStudy,
        story: { ...minimalCaseStudy.story, shifts: Array.from({ length: count }, () => shift) },
      }).success;
    expect(withShifts(0)).toBe(false);
    expect(withShifts(4)).toBe(true);
    expect(withShifts(5)).toBe(false);
    expect(
      projectFrontmatterSchema.safeParse({
        ...minimalCaseStudy,
        story: { ...minimalCaseStudy.story, hook: 'x'.repeat(161) },
      }).success,
    ).toBe(false);
  });

  it('rejects non-https links', () => {
    const result = projectFrontmatterSchema.safeParse({
      ...minimalCaseStudy,
      links: [{ label: 'site', url: 'http://example.com' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('toProject', () => {
  const data = projectFrontmatterSchema.parse(minimalCaseStudy);

  it('takes slug and locale from the entry id', () => {
    const result = toProject('operations-logbook/es', data);
    expect(result.slug).toBe('operations-logbook');
    expect(result.locale).toBe('es');
  });

  it.each(['no-locale', 'logbook/fr', '/es'])('rejects the malformed id "%s"', (id) => {
    expect(() => toProject(id, data)).toThrow(InvalidProjectContentError);
  });

  it('rejects an invalid slug folder', () => {
    expect(() => toProject('Bad_Slug/en', data)).toThrow(/not kebab-case/);
  });
});

describe('catalog and headline metric schemas', () => {
  it('validates technologies against the capability list', () => {
    expect(
      technologySchema.safeParse({ id: 'react', name: 'React', capability: 'frontend' }).success,
    ).toBe(true);
    expect(
      technologySchema.safeParse({ id: 'react', name: 'React', capability: 'design' }).success,
    ).toBe(false);
  });

  it('requires both languages for headline metrics', () => {
    const metric = {
      id: 'systems',
      order: 1,
      value: { es: '6', en: '6' },
      label: { es: 'sistemas', en: 'systems' },
      source: { es: 'auditoría', en: 'audit' },
    };
    expect(headlineMetricSchema.safeParse(metric).success).toBe(true);
    expect(headlineMetricSchema.safeParse({ ...metric, label: { es: 'sistemas' } }).success).toBe(
      false,
    );
  });
});
