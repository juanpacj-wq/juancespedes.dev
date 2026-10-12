import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import type { ListProjects } from './list-projects';

/** The projects shown on the home page: featured ones, in display order, up to `limit`. */
export const makeListFeaturedProjects =
  (listProjects: ListProjects) =>
  async (locale: Locale, limit = 6): Promise<readonly Project[]> =>
    (await listProjects(locale)).filter((project) => project.featured).slice(0, limit);
