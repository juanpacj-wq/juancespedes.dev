import type { HeadlineMetric } from '../../domain/project/metric';
import type { Locale } from '../../domain/shared/locale';

export interface HeadlineMetricRepository {
  findAll(locale: Locale): Promise<readonly HeadlineMetric[]>;
}
