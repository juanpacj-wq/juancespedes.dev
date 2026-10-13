import type { Locale } from '../../domain/shared/locale';
import { err, ok, type Result } from '../../domain/shared/result';
import { sortNotes, type Note } from '../../domain/writing/note';
import type { NoteRepository } from '../ports/writing-repositories';

export interface ListNotesDeps {
  readonly notes: NoteRepository;
  /** True only in development, so authors can preview drafts locally. */
  readonly includeDrafts: boolean;
}

/** Visible notes of a language, newest first. */
export const makeListNotes =
  ({ notes, includeDrafts }: ListNotesDeps) =>
  async (locale: Locale): Promise<readonly Note[]> => {
    const all = await notes.findAll(locale);
    return sortNotes(all.filter((note) => includeDrafts || note.status === 'published'));
  };

export type ListNotes = ReturnType<typeof makeListNotes>;

export interface NoteNotFound {
  readonly kind: 'note-not-found';
  readonly slug: string;
}

/** One visible note. Drafts are "not found" outside development, never leaked. */
export const makeGetNote =
  (listNotes: ListNotes) =>
  async (locale: Locale, slug: string): Promise<Result<Note, NoteNotFound>> => {
    const note = (await listNotes(locale)).find((candidate) => candidate.slug === slug);
    return note ? ok(note) : err({ kind: 'note-not-found', slug });
  };
