import type { PaletteItem } from './palette-index';

/*
 * Ranking for the command palette. Small on purpose: the index has a few dozen items, so a
 * readable scoring function beats a fuzzy-search library in the bundle. Accents and case are
 * ignored, so "telemetria" finds "Telemetría".
 */

export const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Higher is better; 0 means no match. Every word of the query must match somewhere. */
export const scoreItem = (item: PaletteItem, query: string): number => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  const label = normalize(item.label);
  const labelWords = label.split(/[\s,.:;()/-]+/);
  const extra = [item.hint ?? '', ...item.keywords].map(normalize);

  let score = 0;
  for (const word of words) {
    if (label.startsWith(word)) score += 8;
    else if (labelWords.some((part) => part.startsWith(word))) score += 5;
    else if (label.includes(word)) score += 3;
    else if (extra.some((text) => text.includes(word))) score += 1;
    else return 0;
  }
  return score;
};

/** Matching items, best first; ties keep the index order (pages, projects, notes, actions). */
export const searchPalette = (
  items: readonly PaletteItem[],
  query: string,
  limit = 12,
): readonly PaletteItem[] =>
  items
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
