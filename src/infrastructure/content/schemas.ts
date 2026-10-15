import { z } from 'astro/zod';

import {
  ACHIEVEMENT_KINDS,
  validateAchievementChart,
  type AchievementChart,
  type Amount,
} from '../../domain/project/achievement';
import { CAPABILITIES } from '../../domain/project/capability';
import { validateProjectContent, type ProjectContent } from '../../domain/project/project';
import type { Locale } from '../../domain/shared/locale';
import { validateNoteContent, type NoteContent } from '../../domain/writing/note';

/*
 * Shape of the content files. Zod checks types and required keys; the domain's
 * validateProjectContent adds the business rules. Both run when Astro syncs content,
 * so a malformed project fails the build before any page is rendered.
 */

const text = z.string().trim().min(1);
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');

const metric = z.strictObject({ value: text, label: text, source: text });

const common = {
  title: text.max(90),
  summary: text.max(240),
  role: text,
  period: z.strictObject({ start: yearMonth, end: yearMonth.nullable() }),
  capabilities: z.array(z.enum(CAPABILITIES)).min(1),
  stack: z.array(text).min(1),
  metrics: z.array(metric).default([]),
  links: z.array(z.strictObject({ label: text, url: z.url({ protocol: /^https$/ }) })).default([]),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(100),
  status: z.enum(['draft', 'published']).default('draft'),
  confidentiality: z.enum(['public', 'anonymized']),
};

const architecture = z.strictObject({
  summary: text,
  layers: z
    .array(
      z.strictObject({
        name: text,
        nodes: z
          .array(z.strictObject({ id: text, label: text, detail: text.nullable().default(null) }))
          .min(1),
      }),
    )
    .min(2),
  flows: z.array(z.strictObject({ from: text, to: text, label: text })).default([]),
});

const caseStudy = z.strictObject({
  kind: z.literal('case-study'),
  ...common,
  story: z.strictObject({
    hook: text.max(160),
    shifts: z
      .array(z.strictObject({ before: text.max(140), after: text.max(140) }))
      .min(1)
      .max(4),
  }),
  problem: text,
  responsibilities: z.array(text).default([]),
  constraints: z.array(text).min(1),
  decisions: z
    .array(
      z.strictObject({ title: text, rationale: text, alternatives: z.array(text).default([]) }),
    )
    .min(1),
  architecture,
  outcomes: z.array(text).min(1),
  lessons: z.array(text).min(1),
});

const report = z.strictObject({
  kind: z.literal('report'),
  ...common,
  tool: text,
  businessQuestions: z.array(text).min(1),
  dataSources: z.array(text).min(1),
  highlightedMeasures: z.array(text).default([]),
});

const openSource = z.strictObject({
  kind: z.literal('open-source'),
  ...common,
  repository: z.url({ protocol: /^https$/ }),
  license: text,
  install: text.nullable().default(null),
});

const tool = z.strictObject({
  kind: z.literal('tool'),
  ...common,
  platform: text,
  automates: text,
});

export const projectFrontmatterSchema = z
  .discriminatedUnion('kind', [caseStudy, report, openSource, tool])
  .superRefine((content: ProjectContent, context) => {
    for (const issue of validateProjectContent(content)) {
      context.addIssue({ code: 'custom', path: issue.field.split('.'), message: issue.message });
    }
  });

export type ProjectFrontmatter = z.output<typeof projectFrontmatterSchema>;

const localized = z.strictObject({ es: text, en: text });

export const headlineMetricSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().min(0),
  value: localized,
  label: localized,
  source: localized,
});

export type HeadlineMetricEntry = z.output<typeof headlineMetricSchema>;

const amount = z.strictObject({ amount: z.number().min(0), display: localized, label: localized });

const achievementChart = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('compare'), before: amount, after: amount }),
  z.strictObject({ kind: z.literal('breakdown'), items: z.array(amount).min(2) }),
  z.strictObject({
    kind: z.literal('progress'),
    done: z.number().int().min(0),
    total: z.number().int().min(1),
    label: localized,
  }),
]);

/** An achievement for the home page (content/achievements.yaml), in both languages. */
export const achievementSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/),
    order: z.number().int().min(0),
    kind: z.enum(ACHIEVEMENT_KINDS),
    featured: z.boolean().default(false),
    value: localized,
    title: localized,
    summary: localized,
    context: localized,
    source: localized,
    project: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable()
      .default(null),
    chart: achievementChart.nullable().default(null),
  })
  .superRefine((entry, ctx) => {
    // The amounts drive the drawing and are the same in both languages.
    const chart = entry.chart && toChartIn('en', entry.chart);
    for (const issue of validateAchievementChart(chart)) {
      ctx.addIssue({ code: 'custom', path: [issue.field], message: issue.message });
    }
  });

export type AchievementEntry = z.output<typeof achievementSchema>;
type ChartEntry = NonNullable<AchievementEntry['chart']>;
type AmountEntry = z.output<typeof amount>;

const toAmountIn = (locale: Locale, entry: AmountEntry): Amount => ({
  amount: entry.amount,
  display: entry.display[locale],
  label: entry.label[locale],
});

/** A chart entry in one language, as the domain describes it. */
export const toChartIn = (locale: Locale, chart: ChartEntry): AchievementChart => {
  switch (chart.kind) {
    case 'compare':
      return {
        kind: chart.kind,
        before: toAmountIn(locale, chart.before),
        after: toAmountIn(locale, chart.after),
      };
    case 'breakdown':
      return { kind: chart.kind, items: chart.items.map((item) => toAmountIn(locale, item)) };
    case 'progress':
      return { kind: chart.kind, done: chart.done, total: chart.total, label: chart.label[locale] };
  }
};

export const technologySchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  capability: z.enum(CAPABILITIES),
});

export type TechnologyEntry = z.output<typeof technologySchema>;

const period = z
  .strictObject({ start: yearMonth, end: yearMonth.nullable() })
  .refine(({ start, end }) => end === null || start <= end, 'start must not be after end');

export const profileSchema = z.strictObject({
  experience: z
    .array(
      z.strictObject({
        organization: text,
        role: text,
        location: text,
        period,
        summary: text,
        highlights: z.array(text).min(1),
      }),
    )
    .min(1),
  education: z.array(z.strictObject({ institution: text, degree: text, period })).min(1),
  credentials: z.array(
    z.strictObject({
      name: text,
      issuer: text,
      issued: yearMonth,
      url: z.url({ protocol: /^https$/ }).nullable(),
    }),
  ),
  currency: z.enum(['COP', 'USD']),
  services: z
    .array(
      z.strictObject({
        title: text,
        summary: text,
        deliverables: z.array(text).min(1),
        price: z.strictObject({ from: z.number().int().positive(), scope: text }),
        featured: z.boolean().default(false),
      }),
    )
    .min(1)
    .refine(
      (services) => services.filter((service) => service.featured).length <= 1,
      'at most one featured service',
    ),
  process: z.array(z.strictObject({ title: text, description: text })).min(1),
  pricing: text,
});

export type ProfileEntry = z.output<typeof profileSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

/** Technical notes: content/notes/<slug>/{es,en}.mdx. The body is the article (MDX). */
export const noteFrontmatterSchema = z
  .strictObject({
    title: text.max(90),
    summary: text.max(240),
    published: isoDate,
    updated: isoDate.nullable().default(null),
    tags: z.array(text.max(30)).min(1),
    status: z.enum(['draft', 'published']).default('draft'),
  })
  .superRefine((content: NoteContent, context) => {
    for (const issue of validateNoteContent(content)) {
      context.addIssue({ code: 'custom', path: issue.field.split('.'), message: issue.message });
    }
  });

export type NoteFrontmatter = z.output<typeof noteFrontmatterSchema>;

/** The "now" page: content/now/{es,en}.yaml. */
export const nowSchema = z.strictObject({
  updated: isoDate,
  sections: z.array(z.strictObject({ title: text, items: z.array(text).min(1) })).min(1),
});

export type NowEntry = z.output<typeof nowSchema>;
