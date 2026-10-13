import { createNowPage, type NowPage } from '../../domain/now/now-page';
import { parseLocale } from '../../domain/shared/locale';
import { createNote, type Note } from '../../domain/writing/note';
import type { NoteFrontmatter, NowEntry } from './schemas';

/**
 * Notes live in `content/notes/<slug>/<locale>.mdx`, so the entry id is `<slug>/<locale>`.
 * Throws on invalid content: the build-time validation was bypassed and must stop the build.
 */
export const toNote = (entryId: string, data: NoteFrontmatter): Note => {
  const separator = entryId.lastIndexOf('/');
  const locale = parseLocale(entryId.slice(separator + 1));
  if (separator <= 0 || !locale.ok) {
    throw new Error(`Invalid note "${entryId}": expected an id like "<slug>/<es|en>"`);
  }
  const note = createNote({ slug: entryId.slice(0, separator), locale: locale.value }, data);
  if (!note.ok) {
    const details = note.error.map((issue) => `${issue.field}: ${issue.message}`).join('; ');
    throw new Error(`Invalid note "${entryId}": ${details}`);
  }
  return note.value;
};

export const toNowPage = (entry: NowEntry): NowPage => {
  const page = createNowPage(entry);
  if (!page.ok) {
    const details = page.error.map((issue) => `${issue.field}: ${issue.message}`).join('; ');
    throw new Error(`Invalid now page: ${details}`);
  }
  return page.value;
};
