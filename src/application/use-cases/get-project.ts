import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import { err, ok, type Result } from '../../domain/shared/result';
import type { ListProjects } from './list-projects';

export interface ProjectNotFound {
  readonly kind: 'project-not-found';
  readonly slug: string;
}

/** A single visible project. Drafts are "not found" outside development, never leaked. */
export const makeGetProject =
  (listProjects: ListProjects) =>
  async (locale: Locale, slug: string): Promise<Result<Project, ProjectNotFound>> => {
    const project = (await listProjects(locale)).find((candidate) => candidate.slug === slug);
    return project ? ok(project) : err({ kind: 'project-not-found', slug });
  };
