import { orderAchievements, type Achievement } from '../../domain/project/achievement';
import type { Project } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import type { AchievementRepository } from '../ports/achievement-repository';

interface Dependencies {
  achievements: AchievementRepository;
  listProjects: (locale: Locale) => Promise<readonly Project[]>;
}

/**
 * Achievements for the home page, featured first and then in the author's order. A link to a
 * case study survives only if that case study is published in the same language, so a draft
 * never leaves a dead link behind.
 */
export const makeListAchievements =
  ({ achievements, listProjects }: Dependencies) =>
  async (locale: Locale): Promise<readonly Achievement[]> => {
    const [all, projects] = await Promise.all([achievements.findAll(locale), listProjects(locale)]);
    const published = new Set<string>(projects.map((project) => project.slug));
    return orderAchievements(
      all.map((achievement) =>
        achievement.project === null || published.has(achievement.project)
          ? achievement
          : { ...achievement, project: null },
      ),
    );
  };
