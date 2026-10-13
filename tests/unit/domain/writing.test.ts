import { describe, expect, it } from 'vitest';

import { createNowPage } from '../../../src/domain/now/now-page';
import { compareIsoDate, parseIsoDate, type IsoDate } from '../../../src/domain/shared/iso-date';
import {
  createNote,
  sortNotes,
  validateNoteContent,
  type NoteContent,
} from '../../../src/domain/writing/note';

const content = (overrides: Partial<NoteContent> = {}): NoteContent => ({
  title: 'A strict CSP',
  summary: 'How the policy was built.',
  published: '2026-10-12',
  updated: null,
  tags: ['security'],
  status: 'published',
  ...overrides,
});

describe('parseIsoDate', () => {
  it.each(['2026-10-12', '2024-02-29'])('accepts the real calendar day %s', (value) => {
    expect(parseIsoDate(value)).toEqual({ ok: true, value });
  });

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '2026-10-1', 'x2026-10-12', '2026-10-12x'])(
    'rejects %s and says what it received',
    (value) => {
      expect(parseIsoDate(value)).toEqual({
        ok: false,
        error: { kind: 'invalid-iso-date', received: value },
      });
    },
  );

  it('compares in calendar order', () => {
    const a = '2026-01-31' as IsoDate;
    const b = '2026-02-01' as IsoDate;
    expect(compareIsoDate(a, b)).toBeLessThan(0);
    expect(compareIsoDate(b, a)).toBeGreaterThan(0);
  });
});

describe('notes', () => {
  it('builds a note with its identity and typed dates', () => {
    const note = createNote(
      { slug: 'strict-csp', locale: 'en' },
      content({ updated: '2026-10-20' }),
    );
    expect(note).toEqual({
      ok: true,
      value: expect.objectContaining({
        slug: 'strict-csp',
        locale: 'en',
        published: '2026-10-12',
        updated: '2026-10-20',
      }) as unknown,
    });
  });

  it('explains every broken rule', () => {
    expect(
      validateNoteContent(content({ published: '2026-02-30', updated: '12-10-2026', tags: [] })),
    ).toEqual([
      { field: 'published', message: 'expected YYYY-MM-DD' },
      { field: 'updated', message: 'expected YYYY-MM-DD' },
      { field: 'tags', message: 'a note needs 1 to 5 tags' },
    ]);
  });

  it('refuses an update before publication, too many tags and repeated tags', () => {
    expect(validateNoteContent(content({ updated: '2026-10-11' }))).toEqual([
      { field: 'updated', message: 'updated must not be before published' },
    ]);
    expect(validateNoteContent(content({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toEqual([
      { field: 'tags', message: 'a note needs 1 to 5 tags' },
    ]);
    expect(validateNoteContent(content({ tags: ['Astro', 'astro'] }))).toEqual([
      { field: 'tags', message: 'tags must be unique' },
    ]);
  });

  it('accepts an update on the publication day', () => {
    expect(validateNoteContent(content({ updated: '2026-10-12' }))).toEqual([]);
  });

  it('rejects a slug that is not kebab-case', () => {
    const note = createNote({ slug: 'Bad Slug', locale: 'es' }, content());
    expect(note.ok ? [] : note.error).toEqual([
      { field: 'slug', message: '"Bad Slug" is not kebab-case' },
    ]);
  });

  it('rejects invalid dates even if the schema was bypassed', () => {
    expect(createNote({ slug: 'x', locale: 'es' }, content({ published: 'nope' })).ok).toBe(false);
    expect(createNote({ slug: 'x', locale: 'es' }, content({ updated: 'nope' })).ok).toBe(false);
  });

  it('sorts newest first, then by title', () => {
    const make = (slug: string, published: string, title: string) => {
      const note = createNote({ slug, locale: 'en' }, content({ published, title }));
      if (!note.ok) throw new Error('invalid test note');
      return note.value;
    };
    const older = make('older', '2026-01-10', 'Zeta');
    const newerB = make('newer-b', '2026-05-01', 'Beta');
    const newerA = make('newer-a', '2026-05-01', 'Alpha');
    expect(sortNotes([older, newerB, newerA]).map((n) => n.slug)).toEqual([
      'newer-a',
      'newer-b',
      'older',
    ]);
  });
});

describe('now page', () => {
  const sections = [{ title: 'Work', items: ['Running production systems'] }];

  it('keeps the sections and types the update date', () => {
    expect(createNowPage({ updated: '2026-10-12', sections })).toEqual({
      ok: true,
      value: { updated: '2026-10-12', sections },
    });
  });

  it('needs a real date, at least one section and items in every section', () => {
    expect(
      createNowPage({ updated: '2026-02-30', sections: [{ title: 'Empty', items: [] }] }),
    ).toEqual({
      ok: false,
      error: [
        { field: 'updated', message: 'expected YYYY-MM-DD' },
        { field: 'sections[0].items', message: 'a section needs items' },
      ],
    });
    expect(createNowPage({ updated: '2026-10-12', sections: [] })).toEqual({
      ok: false,
      error: [{ field: 'sections', message: 'the page needs at least one section' }],
    });
  });
});
