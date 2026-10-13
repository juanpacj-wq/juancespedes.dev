/*
 * Splits an assistant answer into text and links to pages of this site. Only same-site paths the
 * route table produces become links (projects, notes, now, privacy, home sections); anything else,
 * including full URLs the model might write, stays plain text. React escapes every part.
 */

export type AnswerPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'link'; readonly href: string };

const SITE_PATH =
  /(?<![\w/])(\/(?:en\/)?(?:proyectos|projects|notas|notes)\/[a-z0-9]+(?:-[a-z0-9]+)*|\/(?:en\/)?(?:ahora|now|notas|notes|privacidad|privacy)(?![\w/-])|\/en(?![\w/-]))/g;

export const linkify = (answer: string): readonly AnswerPart[] => {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const match of answer.matchAll(SITE_PATH)) {
    const href = match[1] ?? '';
    const start = match.index;
    if (start > last) parts.push({ kind: 'text', text: answer.slice(last, start) });
    parts.push({ kind: 'link', href });
    last = start + match[0].length;
  }
  if (last < answer.length) parts.push({ kind: 'text', text: answer.slice(last) });
  return parts;
};
