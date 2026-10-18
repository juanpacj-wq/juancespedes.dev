import { getImage } from 'astro:assets';

import { PROJECT_TRACKS, type Project, type ProjectTrack } from '../../domain/project/project';
import type { Dictionary } from '../i18n/dictionary';
import { projectPath } from '../i18n/routes';
import { mediaFor } from './media';

/** The id of an area of work on the home page, the target of `/#work-analytics` and the like. */
export const workAnchor = (track: ProjectTrack): string => `work-${track}`;

export interface WorkMenuShot {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/** One area of work as the header's projects menu shows it. */
export interface WorkMenuArea {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly href: string;
  readonly projects: readonly { readonly title: string; readonly href: string }[];
  /** Screens of the first projects, fanned out behind the area's name; loaded on first open. */
  readonly shots: readonly WorkMenuShot[];
}

const SHOTS_PER_AREA = 3;

/**
 * The projects menu: every area with its projects, in display order. `sectionHref` turns an
 * area id into a link: `#work-analytics` on the home page, `/#work-analytics` elsewhere.
 */
export const workMenu = async (
  t: Dictionary,
  projects: readonly Project[],
  sectionHref: (id: string) => string,
): Promise<readonly WorkMenuArea[]> => {
  const areas = PROJECT_TRACKS.map((track) => ({
    track,
    projects: projects.filter((project) => project.track === track),
  })).filter((area) => area.projects.length > 0);

  return Promise.all(
    areas.map(async ({ track, projects: inArea }) => {
      const shots = await Promise.all(
        inArea.slice(0, SHOTS_PER_AREA).flatMap((project) => {
          const card = mediaFor(project.slug).card;
          // The menu shows them 7rem wide: one 240 px file covers a 2x screen.
          return card ? [getImage({ src: card.src, width: 240, quality: 75 })] : [];
        }),
      );
      return {
        id: workAnchor(track),
        label: t.trackLabels[track].label,
        blurb: t.trackLabels[track].blurb,
        href: sectionHref(workAnchor(track)),
        projects: inArea.map((project) => ({
          title: project.title,
          href: projectPath(project.locale, project.slug),
        })),
        shots: shots.map((shot) => ({
          src: shot.src,
          width: Number(shot.attributes.width),
          height: Number(shot.attributes.height),
        })),
      };
    }),
  );
};
