import { compareByRecency } from '../shared/year-month';
import type { Project } from './project';

/**
 * Display order: featured first, then the author's explicit `order`, then the most recent
 * work, then title as a stable tie-breaker.
 */
export const compareProjects = (a: Project, b: Project): number => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.order !== b.order) return a.order - b.order;
  const byRecency = compareByRecency(a.period, b.period);
  if (byRecency !== 0) return byRecency;
  return a.title.localeCompare(b.title);
};

export const sortProjects = (projects: readonly Project[]): readonly Project[] =>
  [...projects].sort(compareProjects);

export interface AdjacentProjects {
  readonly previous: Project | null;
  readonly next: Project | null;
}

/** Neighbours in display order, for "previous / next" links on a project page. */
export const adjacentProjects = (projects: readonly Project[], slug: string): AdjacentProjects => {
  const ordered = sortProjects(projects);
  const index = ordered.findIndex((project) => project.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
};
