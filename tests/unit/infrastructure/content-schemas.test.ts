import { describe, expect, it } from 'vitest';

import {
  InvalidProjectContentError,
  toProject,
} from '../../../src/infrastructure/content/project-mapper';
import {
  achievementSchema,
  projectFrontmatterSchema,
  technologySchema,
} from '../../../src/infrastructure/content/schemas';

const minimalCaseStudy = {
  kind: 'case-study',
  title: 'Logbook',
  summary: 'Real-time logbook.',
  role: 'Engineer',
  track: 'full-stack',
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

  it('requires one of the three areas of work', () => {
    expect(
      projectFrontmatterSchema.safeParse({ ...minimalCaseStudy, track: undefined }).success,
    ).toBe(false);
    expect(
      projectFrontmatterSchema.safeParse({ ...minimalCaseStudy, track: 'design' }).success,
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

describe('catalog schema', () => {
  it('validates technologies against the capability list', () => {
    expect(
      technologySchema.safeParse({ id: 'react', name: 'React', capability: 'frontend' }).success,
    ).toBe(true);
    expect(
      technologySchema.safeParse({ id: 'react', name: 'React', capability: 'design' }).success,
    ).toBe(false);
  });
});

describe('achievement schema', () => {
  const both = (text: string) => ({ es: text, en: text });
  const entry = {
    id: 'telemetry-latency',
    order: 1,
    kind: 'performance',
    value: both('44×'),
    title: both('Faster readings'),
    summary: both('Readings take 25 ms.'),
    context: both('Telemetry'),
    source: both('Latency measurements'),
    project: 'plant-telemetry',
    chart: {
      kind: 'compare',
      before: { amount: 1100, display: both('1.1 s'), label: both('Before') },
      after: { amount: 25, display: both('25 ms'), label: both('After') },
    },
  };

  it('accepts a complete entry and fills the defaults', () => {
    expect(achievementSchema.safeParse(entry).success).toBe(true);
    const bare = { ...entry, project: undefined, chart: undefined };
    expect(achievementSchema.parse(bare)).toMatchObject({
      featured: false,
      project: null,
      chart: null,
    });
  });

  it('rejects unknown kinds, missing translations and charts that contradict themselves', () => {
    expect(achievementSchema.safeParse({ ...entry, kind: 'vibes' }).success).toBe(false);
    expect(achievementSchema.safeParse({ ...entry, title: { es: 'Solo' } }).success).toBe(false);
    const progress = { kind: 'progress', done: 40, total: 39, label: both('closed') };
    expect(achievementSchema.safeParse({ ...entry, chart: progress }).success).toBe(false);
  });
});
