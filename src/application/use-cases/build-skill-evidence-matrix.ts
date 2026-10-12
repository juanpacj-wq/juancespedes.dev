import { CAPABILITIES, type Capability } from '../../domain/project/capability';
import type { Project } from '../../domain/project/project';
import { normalizeTechnologyName } from '../../domain/project/technology';
import type { Locale } from '../../domain/shared/locale';
import type { TechnologyCatalog } from '../ports/technology-catalog';
import type { ListProjects } from './list-projects';

export interface ProjectReference {
  readonly slug: string;
  readonly title: string;
}

export interface TechnologyEvidence {
  readonly name: string;
  readonly projects: readonly ProjectReference[];
}

export interface CapabilityEvidence {
  readonly capability: Capability;
  readonly technologies: readonly TechnologyEvidence[];
}

/**
 * For each capability, the technologies the owner has used and the visible projects that
 * prove it. Technologies with no visible project are omitted: the page never claims a skill
 * it cannot link to. Most-evidenced technologies come first.
 */
export const makeBuildSkillEvidenceMatrix =
  ({ listProjects, catalog }: { listProjects: ListProjects; catalog: TechnologyCatalog }) =>
  async (locale: Locale): Promise<readonly CapabilityEvidence[]> => {
    const [projects, technologies] = await Promise.all([listProjects(locale), catalog.findAll()]);

    const usedBy = new Map<string, Project[]>();
    for (const project of projects) {
      for (const name of project.stack) {
        const key = normalizeTechnologyName(name);
        usedBy.set(key, [...(usedBy.get(key) ?? []), project]);
      }
    }

    return CAPABILITIES.map((capability) => ({
      capability,
      technologies: technologies
        .filter((technology) => technology.capability === capability)
        .map((technology) => ({
          name: technology.name,
          projects: (usedBy.get(normalizeTechnologyName(technology.name)) ?? []).map(
            ({ slug, title }) => ({ slug, title }),
          ),
        }))
        .filter((evidence) => evidence.projects.length > 0)
        .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name)),
    }));
  };
