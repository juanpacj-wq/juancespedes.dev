import type { Locale } from '../shared/locale';
import { err, ok, type Result } from '../shared/result';
import { parseSlug, type Slug } from '../shared/slug';
import { compareYearMonth, parseYearMonth, type Period } from '../shared/year-month';
import { validateArchitecture, type Architecture } from './architecture';
import type { Capability } from './capability';
import { validateMetric, type Metric } from './metric';
import { normalizeTechnologyName } from './technology';

export const PROJECT_KINDS = ['case-study', 'report', 'open-source', 'tool'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export type PublicationStatus = 'draft' | 'published';

/** `anonymized`: built for an employer or client; names, data and screenshots are recreated. */
export type Confidentiality = 'public' | 'anonymized';

export interface ProjectLink {
  readonly label: string;
  readonly url: string;
}

/** One change the project made, told as the people who use it would see it. */
export interface Shift {
  readonly before: string;
  readonly after: string;
}

/**
 * The problem in plain words, for a reader who is not an engineer: one sentence that states the
 * pain, then what changed for the people involved. The technical fields tell the rest.
 */
export interface Story {
  readonly hook: string;
  readonly shifts: readonly Shift[];
}

export interface Decision {
  readonly title: string;
  readonly rationale: string;
  readonly alternatives: readonly string[];
}

/** Fields every kind shares. Locale-specific text lives in each localized file. */
interface CommonContent {
  readonly title: string;
  readonly summary: string;
  readonly role: string;
  readonly period: { readonly start: string; readonly end: string | null };
  readonly capabilities: readonly Capability[];
  readonly stack: readonly string[];
  readonly metrics: readonly Metric[];
  readonly links: readonly ProjectLink[];
  readonly featured: boolean;
  readonly order: number;
  readonly status: PublicationStatus;
  readonly confidentiality: Confidentiality;
}

/**
 * The long-form template: summary, problem, role, constraints, decisions with what was ruled
 * out, architecture, results, what I would do differently, stack and public links.
 */
export interface CaseStudyContent extends CommonContent {
  readonly kind: 'case-study';
  readonly story: Story;
  readonly problem: string;
  /** What the role meant in practice; `role` is the one-line version. */
  readonly responsibilities: readonly string[];
  readonly constraints: readonly string[];
  readonly decisions: readonly Decision[];
  readonly architecture: Architecture;
  /** Results in words; `metrics` holds the figures. */
  readonly outcomes: readonly string[];
  /** "What I would do differently": hindsight, not a list of achievements. */
  readonly lessons: readonly string[];
}

export interface ReportContent extends CommonContent {
  readonly kind: 'report';
  readonly tool: string;
  readonly businessQuestions: readonly string[];
  readonly dataSources: readonly string[];
  readonly highlightedMeasures: readonly string[];
}

export interface OpenSourceContent extends CommonContent {
  readonly kind: 'open-source';
  readonly repository: string;
  readonly license: string;
  readonly install: string | null;
}

export interface ToolContent extends CommonContent {
  readonly kind: 'tool';
  readonly platform: string;
  readonly automates: string;
}

/** What an author writes: everything except the identity, which comes from the file location. */
export type ProjectContent = CaseStudyContent | ReportContent | OpenSourceContent | ToolContent;

interface Identity {
  readonly slug: Slug;
  readonly locale: Locale;
  readonly period: Period;
}

/** A validated project in one locale. */
export type Project = (
  | Omit<CaseStudyContent, 'period'>
  | Omit<ReportContent, 'period'>
  | Omit<OpenSourceContent, 'period'>
  | Omit<ToolContent, 'period'>
) &
  Identity;

export interface ProjectIssue {
  readonly field: string;
  readonly message: string;
}

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const duplicates = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
};

const requireNonEmpty = (field: string, items: readonly unknown[]): ProjectIssue[] =>
  items.length === 0 ? [{ field, message: `${field} must have at least one item` }] : [];

const kindIssues = (content: ProjectContent): ProjectIssue[] => {
  switch (content.kind) {
    case 'case-study':
      return [
        ...(content.problem.trim() === ''
          ? [{ field: 'problem', message: 'problem must not be blank' }]
          : []),
        ...(content.story.hook.trim() === ''
          ? [{ field: 'story.hook', message: 'story.hook must not be blank' }]
          : []),
        ...requireNonEmpty('story.shifts', content.story.shifts),
        ...requireNonEmpty('constraints', content.constraints),
        ...requireNonEmpty('decisions', content.decisions),
        ...validateArchitecture(content.architecture).map((issue) => ({
          field: `architecture.${issue.field}`,
          message: issue.message,
        })),
        ...requireNonEmpty('outcomes', content.outcomes),
        ...requireNonEmpty('lessons', content.lessons),
      ];
    case 'report':
      return [
        ...requireNonEmpty('businessQuestions', content.businessQuestions),
        ...requireNonEmpty('dataSources', content.dataSources),
      ];
    case 'open-source':
      return isHttpsUrl(content.repository)
        ? []
        : [{ field: 'repository', message: 'repository must be an https URL' }];
    case 'tool':
      return [];
  }
};

/**
 * Business rules for a project, independent of where it is stored. Shape checks (types,
 * required keys) happen in the content schema; these are the rules a schema cannot express.
 */
export const validateProjectContent = (content: ProjectContent): readonly ProjectIssue[] => {
  const issues: ProjectIssue[] = [];

  const start = parseYearMonth(content.period.start);
  const end = content.period.end === null ? null : parseYearMonth(content.period.end);
  if (!start.ok) issues.push({ field: 'period.start', message: 'expected YYYY-MM' });
  if (end && !end.ok) issues.push({ field: 'period.end', message: 'expected YYYY-MM or null' });
  if (start.ok && end?.ok && compareYearMonth(start.value, end.value) > 0) {
    issues.push({ field: 'period', message: 'start must not be after end' });
  }

  issues.push(...requireNonEmpty('capabilities', content.capabilities));
  for (const capability of duplicates(content.capabilities)) {
    issues.push({ field: 'capabilities', message: `duplicate capability "${capability}"` });
  }

  issues.push(...requireNonEmpty('stack', content.stack));
  for (const name of duplicates(content.stack.map(normalizeTechnologyName))) {
    issues.push({ field: 'stack', message: `duplicate technology "${name}"` });
  }

  content.metrics.forEach((metric, index) => {
    for (const issue of validateMetric(metric)) {
      issues.push({ field: `metrics[${String(index)}].${issue.field}`, message: issue.message });
    }
  });
  if (content.featured && content.metrics.length === 0) {
    issues.push({ field: 'metrics', message: 'a featured project needs a measurable result' });
  }

  content.links.forEach((link, index) => {
    if (!isHttpsUrl(link.url)) {
      issues.push({ field: `links[${String(index)}].url`, message: 'links must be https URLs' });
    }
  });

  issues.push(...kindIssues(content));
  return issues;
};

/** Builds a project from its file identity (folder slug and locale) and its content. */
export const createProject = (
  identity: { readonly slug: string; readonly locale: Locale },
  content: ProjectContent,
): Result<Project, readonly ProjectIssue[]> => {
  const slug = parseSlug(identity.slug);
  const start = parseYearMonth(content.period.start);
  const end = content.period.end === null ? ok(null) : parseYearMonth(content.period.end);
  const issues = [
    ...(slug.ok ? [] : [{ field: 'slug', message: `"${identity.slug}" is not kebab-case` }]),
    ...validateProjectContent(content),
  ];
  if (!slug.ok || !start.ok || !end.ok || issues.length > 0) return err(issues);

  const period: Period = { start: start.value, end: end.value };
  return ok({ ...content, slug: slug.value, locale: identity.locale, period });
};

export const isPublished = (project: Project): boolean => project.status === 'published';
