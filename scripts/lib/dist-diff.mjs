// Compares two builds of the site (scripts/compare-dist.mjs), so a refactor can show that visitors
// get the same pages before Lighthouse runs in CI (ADR 0034). Script and style chunks carry a
// content hash in their name, and moving code between modules changes it without changing what a
// page does, so pages are compared with those names normalized and chunks are reported by size.
// Images and fonts keep their names: their hash comes from the source file, so a different name
// means a different file.

const CHUNK_NAME = /(\/_astro\/[\w.-]+?)\.[\w-]{8}\.(js|css)\b/g;
const CHUNK_FILE = /^_astro\/.+\.(js|css)$/;

/**
 * Replaces the hash in every script and style chunk name with `[hash]`.
 * @param {string} text
 */
export const normalizeChunkNames = (text) => text.replace(CHUNK_NAME, '$1.[hash].$2');

/**
 * The name a built file is compared under: its path, with a chunk hash normalized.
 * @param {string} path relative to the build root, with forward slashes
 */
export const buildKey = (path) => normalizeChunkNames(`/${path}`).slice(1);

/**
 * @typedef {{ kind: 'page' | 'chunk' | 'binary', content: string, size: number }} BuiltFile
 *   `content` is the normalized text of a page or chunk, or a digest of a binary file.
 */

/**
 * Whether a built file is a script or style chunk, reported by size rather than by content.
 * @param {string} path
 */
export const isChunk = (path) => CHUNK_FILE.test(path);

/**
 * The first line where two texts differ, with a short excerpt of each side.
 * @param {string} a
 * @param {string} b
 */
export const firstDifference = (a, b) => {
  const left = a.split(/\r?\n/);
  const right = b.split(/\r?\n/);
  let line = 0;
  while (line < left.length && line < right.length && left[line] === right[line]) line++;
  const before = left[line] ?? '';
  const after = right[line] ?? '';
  // Built pages are mostly one long line, so the excerpt starts where the line changes.
  let column = 0;
  while (column < before.length && column < after.length && before[column] === after[column]) {
    column++;
  }
  const start = Math.max(0, column - 40);
  return {
    line: line + 1,
    before: before.slice(start, start + 120),
    after: after.slice(start, start + 120),
  };
};

/**
 * What changed between two builds, keyed by `buildKey`.
 * @param {ReadonlyMap<string, BuiltFile>} a
 * @param {ReadonlyMap<string, BuiltFile>} b
 */
export const compareBuilds = (a, b) => {
  /** @type {string[]} */
  const onlyInA = [];
  /** @type {string[]} */
  const onlyInB = [];
  /** @type {string[]} */
  const changed = [];

  for (const [key, left] of a) {
    const right = b.get(key);
    if (right === undefined) {
      onlyInA.push(key);
      continue;
    }
    if (left.content === right.content) continue;
    if (left.kind === 'page') {
      const difference = firstDifference(left.content, right.content);
      changed.push(
        `${key}:${String(difference.line)}\n    - ${difference.before}\n    + ${difference.after}`,
      );
    } else {
      changed.push(`${key}: ${String(left.size)} → ${String(right.size)} bytes`);
    }
  }
  for (const key of b.keys()) if (!a.has(key)) onlyInB.push(key);

  return { onlyInA: onlyInA.sort(), onlyInB: onlyInB.sort(), changed: changed.sort() };
};
