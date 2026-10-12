import type { HeadlineMetric } from '../../domain/project/metric';
import type { Locale } from '../../domain/shared/locale';
import type { HeadlineMetricRepository } from '../ports/headline-metric-repository';

/** Figures for the home page metrics grid, in the author's order. */
export const makeListHeadlineMetrics =
  (metrics: HeadlineMetricRepository) =>
  async (locale: Locale): Promise<readonly HeadlineMetric[]> =>
    [...(await metrics.findAll(locale))].sort((a, b) => a.order - b.order);
