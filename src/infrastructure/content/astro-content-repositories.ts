import { getCollection, getEntry } from 'astro:content';

import type { HeadlineMetricRepository } from '../../application/ports/headline-metric-repository';
import type { ProfileRepository } from '../../application/ports/profile-repository';
import type { ProjectRepository } from '../../application/ports/project-repository';
import type { TechnologyCatalog } from '../../application/ports/technology-catalog';
import { toProfile } from './profile-mapper';
import { toProject } from './project-mapper';

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
