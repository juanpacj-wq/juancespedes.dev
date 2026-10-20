import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * Names of internal systems, servers, vendors and people cannot be listed in a public repository
 * without leaking them, so the list lives outside it: a local, git-ignored .content-denylist file,
 * and the CONTENT_DENYLIST secret in CI. Without either (e.g. a fork), the check is skipped.
 *
 * It scans every tracked text file, not only content/: tests and evaluation cases leaked names
 * before. A failure names the file, the line and the entry number, never the term itself, because
 * CI logs of a public repository are public too.
 */

const ROOT = process.cwd();
const DENYLIST_FILE = join(ROOT, '.content-denylist');
const BINARY = /\.(png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|pdf|zip)$/i;
const SKIPPED = new Set(['pnpm-lock.yaml']);

const source =
  process.env.CONTENT_DENYLIST ??
  (existsSync(DENYLIST_FILE) ? readFileSync(DENYLIST_FILE, 'utf8') : '');
const terms = source
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'));
const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = terms.map((term) =>
  term.startsWith('re:')
    ? new RegExp(term.slice(3), 'u')
    : new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, 'iu'),
);

const trackedTextFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter((path) => path !== '' && !BINARY.test(path) && !SKIPPED.has(path));

describe('internal names denylist', () => {
  it.skipIf(terms.length === 0)(
    'no tracked file names an internal system, vendor or person',
    () => {
      const hits = trackedTextFiles().flatMap((path) =>
        readFileSync(join(ROOT, path), 'utf8')
          .split(/\r?\n/)
          .flatMap((line, index) =>
            patterns.flatMap((pattern, entry) =>
              pattern.test(line)
                ? [`${path}:${String(index + 1)} (denylist entry ${String(entry + 1)})`]
                : [],
            ),
          ),
      );
      expect(hits).toEqual([]);
    },
  );
});
