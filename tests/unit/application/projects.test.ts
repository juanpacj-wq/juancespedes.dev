import { describe, expect, it } from 'vitest';

import type { AchievementRepository } from '../../../src/application/ports/achievement-repository';
import type { ProjectRepository } from '../../../src/application/ports/project-repository';
import type { TechnologyCatalog } from '../../../src/application/ports/technology-catalog';
import { makeBuildSkillEvidenceMatrix } from '../../../src/application/use-cases/build-skill-evidence-matrix';
import { makeGetProject } from '../../../src/application/use-cases/get-project';
import { makeGetProjectPage } from '../../../src/application/use-cases/get-project-page';
import { makeListAchievements } from '../../../src/application/use-cases/list-achievements';
import { makeListFeaturedProjects } from '../../../src/application/use-cases/list-featured-projects';
import { makeListProjects } from '../../../src/application/use-cases/list-projects';
import type { Project } from '../../../src/domain/project/project';
import {
  caseStudyContent,
  openSourceContent,
  project,
  reportContent,
} from '../../support/project-builders';

const logbook = project(
  'logbook',
  caseStudyContent({
    title: 'Logbook',
    featured: true,
    order: 1,
    capabilities: ['backend', 'frontend'],
    stack: ['React', 'Node.js', 'SQL Server'],
  }),
);
const telemetry = project(
  'telemetry',
  caseStudyContent({
    title: 'Telemetry',
    featured: true,
    order: 2,
    capabilities: ['data-bi', 'backend'],
    stack: ['Node.js', 'SQL Server', 'Power BI'],
  }),
);
const report = project('sales-report', reportContent({ title: 'Sales report' }));
const draft = project(
  'draft-tool',
  openSourceContent({ status: 'draft', stack: ['Playwright'], capabilities: ['automation-ai'] }),
);
const spanish = project('logbook', caseStudyContent({ title: 'Bitácora' }), 'es');

const repository = (projects: readonly Project[]): ProjectRepository => ({
  findAll: (locale) => Promise.resolve(projects.filter((p) => p.locale === locale)),
});

const all = repository([report, draft, telemetry, logbook, spanish]);
const listProjects = makeListProjects({ projects: all, includeDrafts: false });

describe('listProjects', () => {
  it('returns published projects of the locale in display order', async () => {
    expect((await listProjects('en')).map((p) => p.slug)).toEqual([
      'logbook',
      'telemetry',
      'sales-report',
    ]);
    expect((await listProjects('es')).map((p) => p.title)).toEqual(['Bitácora']);
  });

  it('includes drafts when configured for development', async () => {
    const withDrafts = makeListProjects({ projects: all, includeDrafts: true });
    expect((await withDrafts('en')).map((p) => p.slug)).toContain('draft-tool');
  });

  it('filters by capability and by kind', async () => {
    expect((await listProjects('en', { capability: 'data-bi' })).map((p) => p.slug)).toEqual([
      'telemetry',
      'sales-report',
    ]);
    expect((await listProjects('en', { kind: 'report' })).map((p) => p.slug)).toEqual([
      'sales-report',
    ]);
  });
});

describe('listFeaturedProjects', () => {
  const listFeatured = makeListFeaturedProjects(listProjects);

  it('returns only featured projects, capped by the limit', async () => {
    expect((await listFeatured('en')).map((p) => p.slug)).toEqual(['logbook', 'telemetry']);
    expect((await listFeatured('en', 1)).map((p) => p.slug)).toEqual(['logbook']);
  });
});

describe('getProject', () => {
  const getProject = makeGetProject(listProjects);

  it('finds a visible project by slug', async () => {
    const result = await getProject('en', 'telemetry');
    expect(result.ok && result.value.title).toBe('Telemetry');
  });

  it('reports drafts and unknown slugs as not found', async () => {
    expect(await getProject('en', 'draft-tool')).toEqual({
      ok: false,
      error: { kind: 'project-not-found', slug: 'draft-tool' },
    });
    expect((await getProject('en', 'nope')).ok).toBe(false);
  });
});

describe('getProjectPage', () => {
  const getProjectPage = makeGetProjectPage(listProjects);

  it('returns the project with its neighbours in display order', async () => {
    expect(await getProjectPage('en', 'telemetry')).toEqual({
      ok: true,
      value: { project: telemetry, previous: logbook, next: report },
    });
  });

  it('has no neighbour past either end', async () => {
    const result = await getProjectPage('es', 'logbook');
    expect(result.ok && [result.value.previous, result.value.next]).toEqual([null, null]);
  });

  it('treats drafts and unknown slugs as not found', async () => {
    expect(await getProjectPage('en', 'draft-tool')).toEqual({
      ok: false,
      error: { kind: 'project-not-found', slug: 'draft-tool' },
    });
  });
});

describe('buildSkillEvidenceMatrix', () => {
  const catalog: TechnologyCatalog = {
    findAll: () =>
      Promise.resolve([
        { name: 'React', capability: 'frontend' },
        { name: 'Astro', capability: 'frontend' },
        { name: 'Node.js', capability: 'backend' },
        { name: 'SQL Server', capability: 'data-bi' },
        { name: 'Power BI', capability: 'data-bi' },
        { name: 'Playwright', capability: 'automation-ai' },
      ]),
  };
  const build = makeBuildSkillEvidenceMatrix({ listProjects, catalog });

  it('links each technology to the visible projects that use it, most evidenced first', async () => {
    const matrix = await build('en');
    const byCapability = Object.fromEntries(matrix.map((row) => [row.capability, row]));

    expect(matrix.map((row) => row.capability)).toEqual([
      'frontend',
      'backend',
      'data-bi',
      'automation-ai',
      'infrastructure',
      'legacy-systems',
    ]);
    expect(byCapability.frontend?.technologies).toEqual([
      { name: 'React', projects: [{ slug: 'logbook', title: 'Logbook' }] },
    ]);
    expect(byCapability['data-bi']?.technologies.map((t) => t.name)).toEqual([
      'Power BI',
      'SQL Server',
    ]);
    expect(byCapability.backend?.technologies[0]?.projects).toHaveLength(2);
  });

  it('never claims a technology without a visible project (drafts do not count)', async () => {
    const matrix = await build('en');
    const automation = matrix.find((row) => row.capability === 'automation-ai');
    expect(automation?.technologies).toEqual([]);
  });
});

describe('listAchievements', () => {
  const base = {
    kind: 'security',
    value: '0',
    title: 'Title',
    summary: 'Summary',
    context: 'Context',
    source: 'Source',
    chart: null,
    featured: false,
  } as const;
  const achievements: AchievementRepository = {
    findAll: () =>
      Promise.resolve([
        { ...base, id: 'linked', order: 2, project: 'telemetry' },
        { ...base, id: 'draft-link', order: 3, project: 'draft-tool' },
        { ...base, id: 'featured', order: 4, project: null, featured: true },
        { ...base, id: 'unlinked', order: 1, project: null },
      ]),
  };
  const list = makeListAchievements({ achievements, listProjects });

  it('puts the featured achievement first and keeps the author order', async () => {
    expect((await list('en')).map((a) => a.id)).toEqual([
      'featured',
      'unlinked',
      'linked',
      'draft-link',
    ]);
  });

  it('links only to case studies published in the same language', async () => {
    const byId = new Map((await list('en')).map((a) => [a.id, a.project]));
    expect(byId.get('linked')).toBe('telemetry');
    expect(byId.get('draft-link')).toBeNull();
    expect((await list('es')).map((a) => a.project)).not.toContain('telemetry');
  });
});
