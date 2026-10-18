import { getImage } from 'astro:assets';

import { PROJECT_TRACKS, type Project, type ProjectTrack } from '../../domain/project/project';
import type { Dictionary } from '../i18n/dictionary';
import { projectPath } from '../i18n/routes';
import { mediaFor } from './media';
import { SCREENSHOT_QUALITY } from './screenshots';

/** The id of an area of work on the home page, the target of `/#work-analytics` and the like. */
export const workAnchor = (track: ProjectTrack): string => `work-${track}`;

export interface WorkMenuShot {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

/** A project as the menu lists it: its short name, and its screen and title for the preview. */
export interface WorkMenuProject {
  readonly slug: string;
  readonly name: string;
  readonly title: string;
  readonly href: string;
  /** Loaded the first time the menu opens; null for a project without a screenshot. */
  readonly shot: WorkMenuShot | null;
}

/** One area of work as the header's projects menu shows it. */
export interface WorkMenuArea {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly projects: readonly WorkMenuProject[];
}

/*
 * The preview is 18rem wide: a 600 px file covers a 2x screen. AVIF keeps full colour detail
 * (sharp encodes it 4:4:4), so small coloured text in a screenshot stays legible.
 */
const PREVIEW_WIDTH = 600;

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
    areas.map(async ({ track, projects: inArea }) => ({
      id: workAnchor(track),
      label: t.trackLabels[track].label,
      href: sectionHref(workAnchor(track)),
      projects: await Promise.all(
        inArea.map(async (project) => {
          const card = mediaFor(project.slug).card;
          const shot = card
            ? await getImage({
                src: card.src,
                width: PREVIEW_WIDTH,
                format: 'avif',
                quality: SCREENSHOT_QUALITY.avif,
              })
            : null;
          return {
            slug: project.slug,
            name: project.name,
            title: project.title,
            href: projectPath(project.locale, project.slug),
            shot: shot
              ? {
                  src: shot.src,
                  width: Number(shot.attributes.width),
                  height: Number(shot.attributes.height),
                }
              : null,
          };
        }),
      ),
    })),
  );
};
