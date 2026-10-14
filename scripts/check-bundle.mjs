#!/usr/bin/env node
// Fails the build when client JavaScript grows past its budget (gzip, level 9).
// Run after `pnpm build`. Budgets live here so a change to them shows up in code review.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIR = join(process.cwd(), 'dist', 'client', '_astro');
const BUDGET_KB = {
  // React runtime plus every island and page script. Islands hydrate on visibility and page
  // scripts are deferred modules, so none of this blocks the first paint; the budget keeps it
  // from growing unnoticed. Raised from 75 to 80 for the case study motion (about 3 kB, loaded
  // on project pages only, ADR 0021).
  total: 80,
  // Any single chunk other than the shared React runtime.
  chunk: 10,
};

const files = readdirSync(DIR).filter((name) => name.endsWith('.js'));
const sizes = files.map((name) => ({
  name,
  kb: gzipSync(readFileSync(join(DIR, name)), { level: 9 }).length / 1024,
}));
const total = sizes.reduce((sum, file) => sum + file.kb, 0);
// The shared runtime is the largest chunk; every other chunk gets the per-chunk budget.
const runtime = [...sizes].sort((a, b) => b.kb - a.kb)[0];

const problems = [];
if (total > BUDGET_KB.total) {
  problems.push(`total ${total.toFixed(1)} kB > ${String(BUDGET_KB.total)} kB`);
}
for (const file of sizes) {
  if (file !== runtime && file.kb > BUDGET_KB.chunk) {
    problems.push(`${file.name} ${file.kb.toFixed(1)} kB > ${String(BUDGET_KB.chunk)} kB`);
  }
}

for (const file of sizes) console.log(`${file.kb.toFixed(1).padStart(6)} kB  ${file.name}`);
console.log(`${total.toFixed(1).padStart(6)} kB  total (budget ${String(BUDGET_KB.total)} kB)`);
if (problems.length > 0) {
  console.error(`JavaScript budget exceeded:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
