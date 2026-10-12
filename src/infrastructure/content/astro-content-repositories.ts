import { getCollection } from 'astro:content';

import type { HeadlineMetricRepository } from '../../application/ports/headline-metric-repository';
import type { ProjectRepository } from '../../application/ports/project-repository';
import type { TechnologyCatalog } from '../../application/ports/technology-catalog';
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
      source: data.source,
    }));
  },
};

export const astroTechnologyCatalog: TechnologyCatalog = {
  async findAll() {
    const entries = await getCollection('technologies');
    return entries.map(({ data }) => ({ name: data.name, capability: data.capability }));
  },
};
