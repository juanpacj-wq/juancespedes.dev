#!/usr/bin/env node
// Scaffolds content/projects/<slug>/{es,en}.mdx as a valid draft.
// Usage: pnpm new:project <kind> <slug> "<title es>" "<title en>"
//        pnpm new:project            (asks for each value)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { isValidSlug, KINDS, renderProjectFile } from './lib/project-template.mjs';

const args = process.argv.slice(2);
const rl =
  args.length >= 4 ? null : createInterface({ input: process.stdin, output: process.stdout });
/** @param {number} index @param {string} question */
const ask = async (index, question) => args[index] ?? (await rl?.question(question))?.trim() ?? '';

const kind = await ask(0, `Kind (${KINDS.join(', ')}): `);
const slug = await ask(1, 'Slug (kebab-case, e.g. sales-dashboard): ');
const titleEs = await ask(2, 'Title in Spanish: ');
const titleEn = await ask(3, 'Title in English: ');
rl?.close();

const fail = (/** @type {string} */ message) => {
  console.error(`new:project: ${message}`);
  process.exit(1);
};

if (!KINDS.includes(/** @type {never} */ (kind))) fail(`unknown kind "${kind}"`);
if (!isValidSlug(slug)) fail(`"${slug}" is not kebab-case`);
if (!titleEs || !titleEn) fail('both titles are required');

const dir = join(process.cwd(), 'content', 'projects', slug);
if (existsSync(dir)) fail(`content/projects/${slug} already exists`);

const start = new Date().toISOString().slice(0, 7);
mkdirSync(dir, { recursive: true });
for (const [locale, title] of /** @type {const} */ ([
  ['es', titleEs],
  ['en', titleEn],
])) {
  writeFileSync(
    join(dir, `${locale}.mdx`),
    renderProjectFile({ kind: /** @type {never} */ (kind), title, locale, start }),
  );
}

console.log(`Created content/projects/${slug}/es.mdx and en.mdx (status: draft).`);
console.log('Next: replace every TODO, add metrics with sources, then set status: published.');
