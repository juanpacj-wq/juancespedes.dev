import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';

import {
  headlineMetricSchema,
  noteFrontmatterSchema,
  nowSchema,
  profileSchema,
  projectFrontmatterSchema,
  technologySchema,
} from './infrastructure/content/schemas';

/**
 * Content lives outside src/ so authors never touch code. Adding a project is adding
 * content/projects/<slug>/{es,en}.mdx (see docs/adding-a-project.md).
 */
export const collections = {
  projects: defineCollection({
    loader: glob({ pattern: '*/{es,en}.mdx', base: './content/projects' }),
    schema: projectFrontmatterSchema,
  }),
  headlineMetrics: defineCollection({
    loader: file('./content/headline-metrics.yaml'),
    schema: headlineMetricSchema,
  }),
  profile: defineCollection({
    loader: glob({ pattern: '{es,en}.yaml', base: './content/profile' }),
    schema: profileSchema,
  }),
  notes: defineCollection({
    loader: glob({ pattern: '*/{es,en}.mdx', base: './content/notes' }),
    schema: noteFrontmatterSchema,
  }),
  now: defineCollection({
    loader: glob({ pattern: '{es,en}.yaml', base: './content/now' }),
    schema: nowSchema,
  }),
  technologies: defineCollection({
    loader: file('./content/technologies.yaml'),
    schema: technologySchema,
  }),
};
