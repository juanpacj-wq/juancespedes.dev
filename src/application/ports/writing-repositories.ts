import type { NowPage } from '../../domain/now/now-page';
import type { Locale } from '../../domain/shared/locale';
import type { Note } from '../../domain/writing/note';

export interface NoteRepository {
  findAll(locale: Locale): Promise<readonly Note[]>;
}

export interface NowRepository {
  get(locale: Locale): Promise<NowPage>;
}
