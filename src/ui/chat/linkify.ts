/*
 * Splits an assistant answer into text and links to pages of this site. Only same-site paths the
 * route table produces become links (projects, notes, now, privacy, the English home); anything
 * else, including full URLs the model might write, stays plain text. React escapes every part.
 *
 * The href is never the answer's text: it is rebuilt from a constant prefix chosen from an
 * allowlist plus an identifier escaped with encodeURIComponent, so model output cannot inject a
 * URL scheme or markup into a link.
 */

export type AnswerPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'link'; readonly href: string; readonly label: string };

/** Paths that take a slug, and paths that stand alone. Keys are matched; values are emitted. */
const WITH_SLUG: Readonly<Record<string, string>> = {
  '/proyectos/': '/proyectos/',
  '/en/projects/': '/en/projects/',
  '/notas/': '/notas/',
  '/en/notes/': '/en/notes/',
};

const STANDALONE: Readonly<Record<string, string>> = {
  '/ahora': '/ahora',
  '/en/now': '/en/now',
  '/notas': '/notas',
  '/en/notes': '/en/notes',
  '/privacidad': '/privacidad',
  '/en/privacy': '/en/privacy',
  '/en': '/en',
};

const SITE_PATH =
  /(?<![\w/])(?:(\/(?:en\/)?(?:proyectos|projects|notas|notes)\/)([a-z0-9]+(?:-[a-z0-9]+)*)|(\/(?:en\/)?(?:ahora|now|notas|notes|privacidad|privacy)|\/en)(?![\w/-]))/g;

const hrefFor = (
  prefix: string | undefined,
  slug: string | undefined,
  standalone: string | undefined,
) => {
  if (prefix !== undefined && slug !== undefined) {
    const base = WITH_SLUG[prefix];
    return base === undefined ? null : `${base}${encodeURIComponent(slug)}`;
  }
  return standalone === undefined ? null : (STANDALONE[standalone] ?? null);
};

export const linkify = (answer: string): readonly AnswerPart[] => {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const match of answer.matchAll(SITE_PATH)) {
    const href = hrefFor(match[1], match[2], match[3]);
    if (href === null) continue;
    const start = match.index;
    if (start > last) parts.push({ kind: 'text', text: answer.slice(last, start) });
    parts.push({ kind: 'link', href, label: href });
    last = start + match[0].length;
  }
  if (last < answer.length) parts.push({ kind: 'text', text: answer.slice(last) });
  return parts;
};
