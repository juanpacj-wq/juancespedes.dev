import { compareIsoDate, parseIsoDate, type IsoDate } from '../shared/iso-date';
import type { Locale } from '../shared/locale';
import { err, ok, type Result } from '../shared/result';
import { parseSlug, type Slug } from '../shared/slug';

/*
 * A technical note: a short article about how something was built or solved. Notes are written
 * per language like projects; the identity (slug, locale) comes from the file location.
 */

export type NoteStatus = 'draft' | 'published';

/** What an author writes in the note's frontmatter. */
export interface NoteContent {
  readonly title: string;
  readonly summary: string;
  readonly published: string;
  readonly updated: string | null;
  readonly tags: readonly string[];
  readonly status: NoteStatus;
}

export interface Note extends Omit<NoteContent, 'published' | 'updated'> {
  readonly slug: Slug;
  readonly locale: Locale;
  readonly published: IsoDate;
  readonly updated: IsoDate | null;
}

export interface NoteIssue {
  readonly field: string;
  readonly message: string;
}

const MAX_TAGS = 5;

/** Business rules a schema cannot express. */
export const validateNoteContent = (content: NoteContent): readonly NoteIssue[] => {
  const issues: NoteIssue[] = [];
  const published = parseIsoDate(content.published);
  const updated = content.updated === null ? null : parseIsoDate(content.updated);

  if (!published.ok) issues.push({ field: 'published', message: 'expected YYYY-MM-DD' });
  if (updated && !updated.ok) issues.push({ field: 'updated', message: 'expected YYYY-MM-DD' });
  if (published.ok && updated?.ok && compareIsoDate(updated.value, published.value) < 0) {
    issues.push({ field: 'updated', message: 'updated must not be before published' });
  }

  if (content.tags.length === 0 || content.tags.length > MAX_TAGS) {
    issues.push({ field: 'tags', message: `a note needs 1 to ${String(MAX_TAGS)} tags` });
  }
  if (new Set(content.tags.map((tag) => tag.toLowerCase())).size !== content.tags.length) {
    issues.push({ field: 'tags', message: 'tags must be unique' });
  }
  return issues;
};

export const createNote = (
  identity: { readonly slug: string; readonly locale: Locale },
  content: NoteContent,
): Result<Note, readonly NoteIssue[]> => {
  const slug = parseSlug(identity.slug);
  const issues = [
    ...(slug.ok ? [] : [{ field: 'slug', message: `"${identity.slug}" is not kebab-case` }]),
    ...validateNoteContent(content),
  ];
  const published = parseIsoDate(content.published);
  const updated = content.updated === null ? ok(null) : parseIsoDate(content.updated);
  if (!slug.ok || !published.ok || !updated.ok || issues.length > 0) return err(issues);
  return ok({
    ...content,
    slug: slug.value,
    locale: identity.locale,
    published: published.value,
    updated: updated.value,
  });
};

/** Newest first; title breaks ties so the order is stable. */
export const sortNotes = (notes: readonly Note[]): readonly Note[] =>
  [...notes].sort(
    (a, b) => compareIsoDate(b.published, a.published) || a.title.localeCompare(b.title),
  );
