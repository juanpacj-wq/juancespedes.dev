#!/usr/bin/env node
// Fails when UI code uses raw design values instead of tokens (see ADR 0006).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findRawValues } from './lib/token-check.mjs';

const ROOT = process.cwd();
const TOKEN_FILE = join(ROOT, 'src', 'ui', 'styles', 'global.css');
const EXTENSIONS = /\.(astro|tsx|ts|css)$/;

/** @param {string} dir @returns {string[]} */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : EXTENSIONS.test(name) ? [path] : [];
  });

const files = [...walk(join(ROOT, 'src', 'ui')), ...walk(join(ROOT, 'src', 'pages'))].filter(
  (path) => path !== TOKEN_FILE,
);

const problems = files.flatMap((path) =>
  findRawValues(readFileSync(path, 'utf8')).map(
    ({ line, match }) => `${relative(ROOT, path)}:${String(line)}  raw value "${match}"`,
  ),
);

if (problems.length > 0) {
  console.error(`Raw design values found (use tokens from src/ui/styles/global.css):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`tokens: ${String(files.length)} UI files use design tokens only.`);
