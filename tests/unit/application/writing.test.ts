import { describe, expect, it } from 'vitest';

import type {
  NoteRepository,
  NowRepository,
} from '../../../src/application/ports/writing-repositories';
import { makeGetNowPage } from '../../../src/application/use-cases/get-now-page';
import { makeGetNote, makeListNotes } from '../../../src/application/use-cases/notes';
import { createNowPage } from '../../../src/domain/now/now-page';
import { createNote, type Note, type NoteContent } from '../../../src/domain/writing/note';

const note = (slug: string, overrides: Partial<NoteContent> = {}, locale: 'es' | 'en' = 'en') => {
  const result = createNote(
    { slug, locale },
    {
      title: slug,
      summary: 'Summary.',
      published: '2026-10-01',
      updated: null,
      tags: ['testing'],
      status: 'published',
      ...overrides,
    },
  );
  if (!result.ok) throw new Error('invalid test note');
  return result.value;
};

const older = note('older', { published: '2026-01-01' });
const newer = note('newer', { published: '2026-09-01' });
const draft = note('draft', { status: 'draft' });
const spanish = note('nota', {}, 'es');

const repository = (notes: readonly Note[]): NoteRepository => ({
  findAll: (locale) => Promise.resolve(notes.filter((n) => n.locale === locale)),
});

describe('listNotes', () => {
  it('returns published notes of the locale, newest first', async () => {
    const list = makeListNotes({
      notes: repository([older, draft, newer, spanish]),
      includeDrafts: false,
    });
    expect((await list('en')).map((n) => n.slug)).toEqual(['newer', 'older']);
    expect((await list('es')).map((n) => n.slug)).toEqual(['nota']);
  });

  it('shows drafts only when asked to (development)', async () => {
    const list = makeListNotes({ notes: repository([draft]), includeDrafts: true });
    expect((await list('en')).map((n) => n.slug)).toEqual(['draft']);
  });
});

describe('getNote', () => {
  const getNote = makeGetNote(
    makeListNotes({ notes: repository([newer, draft]), includeDrafts: false }),
  );

  it('finds a visible note and treats drafts as missing', async () => {
    expect(await getNote('en', 'newer')).toEqual({ ok: true, value: newer });
    expect(await getNote('en', 'draft')).toEqual({
      ok: false,
      error: { kind: 'note-not-found', slug: 'draft' },
    });
  });
});

describe('getNowPage', () => {
  it('reads the page of the requested locale', async () => {
    const page = createNowPage({ updated: '2026-10-12', sections: [{ title: 'A', items: ['b'] }] });
    if (!page.ok) throw new Error('invalid test page');
    const pages: NowRepository = { get: (locale) => Promise.resolve({ ...page.value, locale }) };
    expect(await makeGetNowPage(pages)('es')).toMatchObject({ updated: '2026-10-12' });
  });
});
