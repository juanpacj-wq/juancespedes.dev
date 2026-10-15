#!/usr/bin/env node
// Fails the build when a page Lighthouse gates (lighthouserc.json) carries what made the budget
// fail before (scripts/lib/page-budget.mjs), so it shows up in two seconds locally instead of one
// CI round later. Run after `pnpm build`. Budgets live here so a change shows up in code review.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { pageProblems } from './lib/page-budget.mjs';

// Compressed HTML per page, in kB: what each page weighed on 2026-10-15 plus about 10 %.
/** @type {Record<string, number>} */
const HTML_BUDGET_KB = {
  '/': 31,
  '/en': 31,
  '/proyectos/plant-telemetry': 25,
  '/en/projects/plant-telemetry': 25,
  '/design-system': 10,
  '/privacidad': 8,
};
const DEFAULT_HTML_BUDGET_KB = 20;

const config = JSON.parse(readFileSync('lighthouserc.json', 'utf8'));
/** @type {string[]} */
const paths = config.ci.collect.url.map(
  (/** @type {string} */ url) => new URL(url).pathname.replace(/\/$/, '') || '/',
);
// build.format 'file': / is index.html, /en is en.html, /a/b is a/b.html.
/** @param {string} path */
const fileFor = (path) => join('dist', 'client', path === '/' ? 'index.html' : `${path}.html`);

const problems = [];
for (const path of paths) {
  const budget = HTML_BUDGET_KB[path] ?? DEFAULT_HTML_BUDGET_KB;
  const result = pageProblems(readFileSync(fileFor(path), 'utf8'), path, budget);
  console.log(`${result.kb.toFixed(1).padStart(6)} kB  ${path} (budget ${String(budget)} kB)`);
  problems.push(...result.problems);
}

if (problems.length > 0) {
  console.error(`Page budget exceeded:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
