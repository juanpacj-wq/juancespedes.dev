import { APP_VERSION } from 'astro:env/server';

import { makeBuildSkillEvidenceMatrix } from '../application/use-cases/build-skill-evidence-matrix';
import { makeGetHealthStatus } from '../application/use-cases/get-health-status';
import { makeGetNowPage } from '../application/use-cases/get-now-page';
import { makeGetProfile } from '../application/use-cases/get-profile';
import { makeGetProject } from '../application/use-cases/get-project';
import { makeGetProjectPage } from '../application/use-cases/get-project-page';
import { makeListAchievements } from '../application/use-cases/list-achievements';
import { makeListFeaturedProjects } from '../application/use-cases/list-featured-projects';
import { makeListProjects } from '../application/use-cases/list-projects';
import { makeGetNote, makeListNotes } from '../application/use-cases/notes';
import {
  astroAchievementRepository,
  astroNoteRepository,
  astroNowRepository,
  astroProfileRepository,
  astroProjectRepository,
  astroTechnologyCatalog,
  renderNoteBody,
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

const listNotes = makeListNotes({ notes: astroNoteRepository, includeDrafts: import.meta.env.DEV });

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
  listAchievements: makeListAchievements({
    achievements: astroAchievementRepository,
    listProjects: (locale) => listProjects(locale),
  }),
  getProfile: makeGetProfile(astroProfileRepository),
  listNotes,
  getNote: makeGetNote(listNotes),
  renderNoteBody,
  getNowPage: makeGetNowPage(astroNowRepository),
} as const;
