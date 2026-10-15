import type { Achievement } from '../../domain/project/achievement';
import type { Locale } from '../../domain/shared/locale';

export interface AchievementRepository {
  findAll(locale: Locale): Promise<readonly Achievement[]>;
}
