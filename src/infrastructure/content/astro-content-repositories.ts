import { getCollection, getEntry, render } from 'astro:content';

import type { HeadlineMetricRepository } from '../../application/ports/headline-metric-repository';
import type { ProfileRepository } from '../../application/ports/profile-repository';
import type { ProjectRepository } from '../../application/ports/project-repository';
import type { TechnologyCatalog } from '../../application/ports/technology-catalog';
import type { NoteRepository, NowRepository } from '../../application/ports/writing-repositories';
import type { Locale } from '../../domain/shared/locale';
import { toProfile } from './profile-mapper';
import { toProject } from './project-mapper';
import { toNote, toNowPage } from './writing-mappers';

/** Adapters over Astro content collections (configured in src/content.config.ts). */

export const astroProjectRepository: ProjectRepository = {
  async findAll(locale) {
    const entries = await getCollection('projects');
    return entries
      .map((entry) => toProject(entry.id, entry.data))
      .filter((p) => p.locale === locale);
  },
};

export const astroHeadlineMetricRepository: HeadlineMetricRepository = {
  async findAll(locale) {
    const entries = await getCollection('headlineMetrics');
    return entries.map(({ data }) => ({
      id: data.id,
      order: data.order,
      value: data.value[locale],
      label: data.label[locale],
      source: data.source[locale],
    }));
  },
};

export const astroTechnologyCatalog: TechnologyCatalog = {
  async findAll() {
    const entries = await getCollection('technologies');
    return entries.map(({ data }) => ({ name: data.name, capability: data.capability }));
  },
};

export const astroProfileRepository: ProfileRepository = {
  async get(locale) {
    const entry = await getEntry('profile', locale);
    if (!entry) throw new Error(`content/profile/${locale}.yaml is missing`);
    return toProfile(entry.data);
  },
};

export const astroNoteRepository: NoteRepository = {
  async findAll(locale) {
    const entries = await getCollection('notes');
    return entries.map((entry) => toNote(entry.id, entry.data)).filter((n) => n.locale === locale);
  },
};

export const astroNowRepository: NowRepository = {
  async get(locale) {
    const entry = await getEntry('now', locale);
    if (!entry) throw new Error(`content/now/${locale}.yaml is missing`);
    return toNowPage(entry.data);
  },
};

/**
 * The rendered MDX body of a note, as an Astro component. Rendering is a presentation concern, so
 * it stays out of the domain model; pages get it through the composition root.
 */
export const renderNoteBody = async (locale: Locale, slug: string) => {
  const entry = await getEntry('notes', `${slug}/${locale}`);
  if (!entry) throw new Error(`content/notes/${slug}/${locale}.mdx is missing`);
  const { Content, headings } = await render(entry);
  return { Content, headings };
};
