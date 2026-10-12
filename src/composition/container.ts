import { APP_VERSION } from 'astro:env/server';

import { makeBuildSkillEvidenceMatrix } from '../application/use-cases/build-skill-evidence-matrix';
import { makeGetHealthStatus } from '../application/use-cases/get-health-status';
import { makeGetProfile } from '../application/use-cases/get-profile';
import { makeGetProject } from '../application/use-cases/get-project';
import { makeGetProjectPage } from '../application/use-cases/get-project-page';
import { makeListFeaturedProjects } from '../application/use-cases/list-featured-projects';
import { makeListHeadlineMetrics } from '../application/use-cases/list-headline-metrics';
import { makeListProjects } from '../application/use-cases/list-projects';
import {
  astroHeadlineMetricRepository,
  astroProfileRepository,
  astroProjectRepository,
  astroTechnologyCatalog,
} from '../infrastructure/content/astro-content-repositories';
import { systemClock } from '../infrastructure/system/system-clock';

/**
 * Composition root: the only place where use cases meet their adapters.
 * Pages ask the container for a use case; they never build adapters themselves.
 */
const listProjects = makeListProjects({
  projects: astroProjectRepository,
  // Drafts are visible in `astro dev` only; builds never publish them.
  includeDrafts: import.meta.env.DEV,
});

export const container = {
  getHealthStatus: makeGetHealthStatus({ clock: systemClock, version: APP_VERSION }),
  listProjects,
  listFeaturedProjects: makeListFeaturedProjects(listProjects),
  getProject: makeGetProject(listProjects),
  getProjectPage: makeGetProjectPage(listProjects),
  buildSkillEvidenceMatrix: makeBuildSkillEvidenceMatrix({
    listProjects,
    catalog: astroTechnologyCatalog,
  }),
  listHeadlineMetrics: makeListHeadlineMetrics(astroHeadlineMetricRepository),
  getProfile: makeGetProfile(astroProfileRepository),
} as const;
