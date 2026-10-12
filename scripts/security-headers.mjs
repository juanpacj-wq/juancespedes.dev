#!/usr/bin/env node
// Runs after `astro build`: hashes every inline script in the generated pages and writes the
// security headers, including the content security policy, into dist/client/_headers.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BASE_HEADERS,
  contentSecurityPolicy,
  inlineScripts,
  scriptHash,
  withGlobalHeaders,
} from './lib/security-headers.mjs';

const CLIENT = join(process.cwd(), 'dist', 'client');
const HEADERS_FILE = join(CLIENT, '_headers');

/** @param {string} dir @returns {string[]} */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.html') ? [path] : [];
  });

if (!existsSync(CLIENT)) {
  console.error('security-headers: dist/client not found; run astro build first.');
  process.exit(1);
}

const pages = walk(CLIENT);
const hashes = pages.flatMap((page) => inlineScripts(readFileSync(page, 'utf8')).map(scriptHash));
const unique = [...new Set(hashes)];
const csp = contentSecurityPolicy(unique);

const existing = existsSync(HEADERS_FILE) ? readFileSync(HEADERS_FILE, 'utf8') : '';
writeFileSync(
  HEADERS_FILE,
  withGlobalHeaders(existing, { ...BASE_HEADERS, 'Content-Security-Policy': csp }),
);

console.log(
  `security-headers: ${String(pages.length)} pages, ${String(unique.length)} inline script hashes`,
);
