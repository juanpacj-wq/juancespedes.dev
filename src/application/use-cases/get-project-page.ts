import type { Project } from '../../domain/project/project';
import { adjacentProjects } from '../../domain/project/project-ordering';
import type { Locale } from '../../domain/shared/locale';
import { err, ok, type Result } from '../../domain/shared/result';
import type { ProjectNotFound } from './get-project';
import type { ListProjects } from './list-projects';

export interface ProjectPage {
  readonly project: Project;
  readonly previous: Project | null;
  readonly next: Project | null;
}

/** A project with its neighbours in display order, so readers can keep browsing. */
export const makeGetProjectPage =
  (listProjects: ListProjects) =>
  async (locale: Locale, slug: string): Promise<Result<ProjectPage, ProjectNotFound>> => {
    const projects = await listProjects(locale);
    const project = projects.find((candidate) => candidate.slug === slug);
    if (!project) return err({ kind: 'project-not-found', slug });
    return ok({ project, ...adjacentProjects(projects, slug) });
  };
