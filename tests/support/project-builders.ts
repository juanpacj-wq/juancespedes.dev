import {
  createProject,
  type CaseStudyContent,
  type OpenSourceContent,
  type Project,
  type ReportContent,
  type ToolContent,
} from '../../src/domain/project/project';
import type { Locale } from '../../src/domain/shared/locale';

const common = {
  title: 'Operations logbook',
  summary: 'Replaced Excel logbooks with a real-time web app.',
  role: 'Full-stack engineer',
  period: { start: '2026-03', end: null },
  capabilities: ['backend', 'frontend'],
  stack: ['React', 'Node.js'],
  metrics: [{ value: '1,400+', label: 'automated tests', source: 'test suites' }],
  links: [],
  featured: false,
  order: 100,
  status: 'published',
  confidentiality: 'anonymized',
} as const;

export const caseStudyContent = (overrides: Partial<CaseStudyContent> = {}): CaseStudyContent => ({
  ...common,
  kind: 'case-study',
  problem: 'Shift logs lived in Excel.',
  constraints: ['Shifts cross midnight'],
  decisions: [{ title: 'Shifts as entities', rationale: 'Immutable history', alternatives: [] }],
  lessons: [],
  ...overrides,
});

export const reportContent = (overrides: Partial<ReportContent> = {}): ReportContent => ({
  ...common,
  kind: 'report',
  capabilities: ['data-bi'],
  stack: ['Power BI'],
  tool: 'Power BI',
  businessQuestions: ['Which unit deviates most from dispatch?'],
  dataSources: ['Telemetry lakehouse'],
  highlightedMeasures: [],
  ...overrides,
});

export const openSourceContent = (
  overrides: Partial<OpenSourceContent> = {},
): OpenSourceContent => ({
  ...common,
  kind: 'open-source',
  repository: 'https://github.com/example/repo',
  license: 'MIT',
  install: null,
  ...overrides,
});

export const toolContent = (overrides: Partial<ToolContent> = {}): ToolContent => ({
  ...common,
  kind: 'tool',
  platform: 'Windows desktop',
  automates: 'Invoice extraction',
  ...overrides,
});

/** A valid project; throws if a test builds an invalid one by mistake. */
export const project = (
  slug: string,
  content: Parameters<typeof createProject>[1] = caseStudyContent(),
  locale: Locale = 'en',
): Project => {
  const result = createProject({ slug, locale }, content);
  if (!result.ok) throw new Error(`invalid test project: ${JSON.stringify(result.error)}`);
  return result.value;
};
