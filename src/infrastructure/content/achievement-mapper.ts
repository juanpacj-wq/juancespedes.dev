import type { Achievement } from '../../domain/project/achievement';
import type { Locale } from '../../domain/shared/locale';
import { toChartIn, type AchievementEntry } from './schemas';

/** One entry of content/achievements.yaml in one language. */
export const toAchievement = (entry: AchievementEntry, locale: Locale): Achievement => ({
  id: entry.id,
  order: entry.order,
  kind: entry.kind,
  featured: entry.featured,
  value: entry.value[locale],
  title: entry.title[locale],
  summary: entry.summary[locale],
  context: entry.context[locale],
  source: entry.source[locale],
  project: entry.project,
  chart: entry.chart && toChartIn(locale, entry.chart),
});
