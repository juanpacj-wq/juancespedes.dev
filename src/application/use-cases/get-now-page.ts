import type { NowPage } from '../../domain/now/now-page';
import type { Locale } from '../../domain/shared/locale';
import type { NowRepository } from '../ports/writing-repositories';

export const makeGetNowPage =
  (pages: NowRepository) =>
  (locale: Locale): Promise<NowPage> =>
    pages.get(locale);
