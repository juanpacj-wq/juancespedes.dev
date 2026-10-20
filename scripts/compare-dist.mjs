#!/usr/bin/env node
// Compares two client builds and fails when visitors would get something different (ADR 0034).
// Lighthouse does not run on every machine, so this is the local evidence that a refactor left the
// pages alone. Usage, from a branch:
//
//   git worktree add ../main-build main && (cd ../main-build && pnpm install && pnpm build)
//   pnpm build && pnpm dist:compare ../main-build/dist/client dist/client
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { buildKey, compareBuilds, isChunk, normalizeChunkNames } from './lib/dist-diff.mjs';

/** @typedef {import('./lib/dist-diff.mjs').BuiltFile} BuiltFile */

const TEXT = /\.(html|xml|txt|json|svg|webmanifest|js|css)$|(^|\/)_headers$/;

/**
 * @param {string} dir
 * @returns {string[]}
 */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

/**
 * @param {string} root
 * @returns {Map<string, BuiltFile>}
 */
const readBuild = (root) => {
  /** @type {Map<string, BuiltFile>} */
  const files = new Map();
  for (const path of walk(root)) {
    const name = relative(root, path).split(sep).join('/');
    const bytes = readFileSync(path);
    /** @type {BuiltFile} */
    const file = TEXT.test(name)
      ? {
          kind: isChunk(name) ? 'chunk' : 'page',
          content: normalizeChunkNames(bytes.toString('utf8')),
          size: bytes.length,
        }
      : {
          kind: 'binary',
          content: createHash('sha256').update(bytes).digest('hex'),
          size: bytes.length,
        };
    let key = buildKey(name);
    // Two chunks with the same name and different hashes; rare, kept apart by a suffix.
    for (let n = 2; files.has(key); n++) key = `${buildKey(name)}#${String(n)}`;
    files.set(key, file);
  }
  return files;
};

const [before, after] = process.argv.slice(2);
if (before === undefined || after === undefined) {
  console.error('Usage: node scripts/compare-dist.mjs <before/dist/client> <after/dist/client>');
  process.exit(2);
}

const a = readBuild(before);
const b = readBuild(after);
const { onlyInA, onlyInB, changed } = compareBuilds(a, b);

console.log(`${String(a.size)} files before, ${String(b.size)} after`);
for (const [title, list] of /** @type {const} */ ([
  ['Only before', onlyInA],
  ['Only after', onlyInB],
  ['Changed', changed],
])) {
  if (list.length > 0) console.log(`\n${title} (${String(list.length)}):\n  ${list.join('\n  ')}`);
}

if (onlyInA.length + onlyInB.length + changed.length > 0) process.exit(1);
console.log('Same output.');
