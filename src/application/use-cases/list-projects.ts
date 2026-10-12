import type { Capability } from '../../domain/project/capability';
import { isPublished, type Project, type ProjectKind } from '../../domain/project/project';
import { sortProjects } from '../../domain/project/project-ordering';
import type { Locale } from '../../domain/shared/locale';
import type { ProjectRepository } from '../ports/project-repository';

export interface ProjectFilter {
  readonly capability?: Capability;
  readonly kind?: ProjectKind;
}

export interface ListProjectsDeps {
  readonly projects: ProjectRepository;
  /** True only in development, so authors can preview drafts locally. */
  readonly includeDrafts: boolean;
}

const matches =
  (filter: ProjectFilter) =>
  (project: Project): boolean =>
    (filter.capability === undefined || project.capabilities.includes(filter.capability)) &&
    (filter.kind === undefined || project.kind === filter.kind);

/** Visible projects in display order, optionally narrowed by capability or kind. */
export const makeListProjects =
  ({ projects, includeDrafts }: ListProjectsDeps) =>
  async (locale: Locale, filter: ProjectFilter = {}): Promise<readonly Project[]> => {
    const all = await projects.findAll(locale);
    const visible = all.filter((project) => includeDrafts || isPublished(project));
    return sortProjects(visible.filter(matches(filter)));
  };

export type ListProjects = ReturnType<typeof makeListProjects>;
