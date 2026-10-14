import { describe, expect, it } from 'vitest';

import { isCapability } from '../../../src/domain/project/capability';
import { validateMetric } from '../../../src/domain/project/metric';
import {
  createProject,
  isPublished,
  validateProjectContent,
} from '../../../src/domain/project/project';
import {
  adjacentProjects,
  compareProjects,
  sortProjects,
} from '../../../src/domain/project/project-ordering';
import {
  architecture,
  caseStudyContent,
  openSourceContent,
  project,
  reportContent,
  toolContent,
} from '../../support/project-builders';

const fields = (issues: readonly { field: string }[]): string[] => issues.map((i) => i.field);

describe('createProject', () => {
  it.each([
    ['case-study', caseStudyContent()],
    ['report', reportContent()],
    ['open-source', openSourceContent()],
    ['tool', toolContent()],
  ] as const)('builds a valid %s with identity and a typed period', (_, content) => {
    const result = createProject({ slug: 'sample', locale: 'es' }, content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.slug).toBe('sample');
    expect(result.value.locale).toBe('es');
    expect(result.value.period).toEqual({ start: '2026-03', end: null });
  });

  it('keeps a closed period', () => {
    const result = createProject(
      { slug: 'sample', locale: 'en' },
      caseStudyContent({ period: { start: '2025-01', end: '2025-06' } }),
    );
    expect(result.ok && result.value.period).toEqual({ start: '2025-01', end: '2025-06' });
  });

  it('rejects a slug that is not kebab-case together with content issues', () => {
    const result = createProject(
      { slug: 'Bad Slug', locale: 'en' },
      caseStudyContent({ stack: [] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(fields(result.error)).toEqual(['slug', 'stack']);
  });

  it('rejects malformed months even if the schema was bypassed', () => {
    const result = createProject(
      { slug: 'sample', locale: 'en' },
      caseStudyContent({ period: { start: '2026-3', end: '2026-13' } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(fields(result.error)).toEqual(['period.start', 'period.end']);
  });
});

describe('validateProjectContent', () => {
  it('accepts a well-formed project', () => {
    expect(validateProjectContent(caseStudyContent())).toEqual([]);
  });

  it('rejects a period that starts after it ends', () => {
    const issues = validateProjectContent(
      caseStudyContent({ period: { start: '2026-05', end: '2026-01' } }),
    );
    expect(fields(issues)).toEqual(['period']);
  });

  it('requires capabilities and stack, without duplicates (case-insensitive for stack)', () => {
    expect(fields(validateProjectContent(caseStudyContent({ capabilities: [] })))).toEqual([
      'capabilities',
    ]);
    expect(
      validateProjectContent(caseStudyContent({ capabilities: ['backend', 'backend'] })),
    ).toEqual([{ field: 'capabilities', message: 'duplicate capability "backend"' }]);
    expect(validateProjectContent(caseStudyContent({ stack: ['React', ' react '] }))).toEqual([
      { field: 'stack', message: 'duplicate technology "react"' },
    ]);
  });

  it('requires every metric to name its source', () => {
    const issues = validateProjectContent(
      caseStudyContent({ metrics: [{ value: '6', label: 'systems', source: ' ' }] }),
    );
    expect(fields(issues)).toEqual(['metrics[0].source']);
  });

  it('requires a measurable result on featured projects', () => {
    const issues = validateProjectContent(caseStudyContent({ featured: true, metrics: [] }));
    expect(fields(issues)).toEqual(['metrics']);
  });

  it('only accepts https links', () => {
    const issues = validateProjectContent(
      caseStudyContent({
        links: [
          { label: 'site', url: 'http://example.com' },
          { label: 'bad', url: 'not a url' },
        ],
      }),
    );
    expect(fields(issues)).toEqual(['links[0].url', 'links[1].url']);
  });

  it('enforces case-study sections', () => {
    const issues = validateProjectContent(
      caseStudyContent({
        story: { hook: ' ', shifts: [] },
        problem: ' ',
        constraints: [],
        decisions: [],
        outcomes: [],
        lessons: [],
      }),
    );
    expect(fields(issues)).toEqual([
      'problem',
      'story.hook',
      'story.shifts',
      'constraints',
      'decisions',
      'outcomes',
      'lessons',
    ]);
  });

  it('validates the case-study architecture and prefixes its fields', () => {
    const issues = validateProjectContent(
      caseStudyContent({ architecture: architecture({ layers: [], flows: [] }) }),
    );
    expect(fields(issues)).toEqual(['architecture.layers']);
  });

  it('enforces report sections', () => {
    const issues = validateProjectContent(
      reportContent({ businessQuestions: [], dataSources: [] }),
    );
    expect(fields(issues)).toEqual(['businessQuestions', 'dataSources']);
  });

  it('requires an https repository for open source', () => {
    const issues = validateProjectContent(openSourceContent({ repository: 'git@github.com:x/y' }));
    expect(fields(issues)).toEqual(['repository']);
  });
});

describe('ordering and publication', () => {
  const featured = project('featured', caseStudyContent({ featured: true, order: 5 }));
  const firstByOrder = project('first', caseStudyContent({ order: 1 }));
  const ongoing = project('ongoing', caseStudyContent({ order: 50 }));
  const finished = project(
    'finished',
    caseStudyContent({ order: 50, period: { start: '2024-01', end: '2024-06' } }),
  );
  const alpha = project('alpha', caseStudyContent({ order: 50, title: 'Alpha' }));
  const beta = project('beta', caseStudyContent({ order: 50, title: 'Beta' }));

  it('sorts featured, then order, then recency, then title', () => {
    expect(sortProjects([finished, ongoing, firstByOrder, featured]).map((p) => p.slug)).toEqual([
      'featured',
      'first',
      'ongoing',
      'finished',
    ]);
    expect(compareProjects(beta, alpha)).toBeGreaterThan(0);
  });

  it('does not mutate the input', () => {
    const input = [finished, featured];
    sortProjects(input);
    expect(input.map((p) => p.slug)).toEqual(['finished', 'featured']);
  });

  it('finds the neighbours of a project in display order', () => {
    const projects = [finished, ongoing, firstByOrder, featured];
    expect(adjacentProjects(projects, 'first')).toEqual({ previous: featured, next: ongoing });
    expect(adjacentProjects(projects, 'featured')).toEqual({ previous: null, next: firstByOrder });
    expect(adjacentProjects(projects, 'finished')).toEqual({ previous: ongoing, next: null });
    expect(adjacentProjects(projects, 'missing')).toEqual({ previous: null, next: null });
  });

  it('knows drafts from published projects', () => {
    expect(isPublished(project('x', caseStudyContent({ status: 'draft' })))).toBe(false);
    expect(isPublished(featured)).toBe(true);
  });
});

describe('capabilities and metrics', () => {
  it('recognizes capabilities', () => {
    expect(isCapability('data-bi')).toBe(true);
    expect(isCapability('marketing')).toBe(false);
  });

  it('reports every blank metric field', () => {
    expect(validateMetric({ value: '', label: ' ', source: 'x' }).map((i) => i.field)).toEqual([
      'value',
      'label',
    ]);
  });
});
