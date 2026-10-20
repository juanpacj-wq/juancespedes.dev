import { describe, expect, it } from 'vitest';

import {
  buildKey,
  compareBuilds,
  firstDifference,
  isChunk,
  normalizeChunkNames,
  type BuiltFile,
} from '../../../scripts/lib/dist-diff.mjs';

const page = (content: string): BuiltFile => ({ kind: 'page', content, size: content.length });
const build = (entries: Record<string, BuiltFile>) => new Map(Object.entries(entries));

describe('build comparison', () => {
  it('normalizes the hash of script and style chunks, including names with dots', () => {
    expect(
      normalizeChunkNames(
        '<link href="/_astro/BaseLayout.Va-P1est.css"><script src="/_astro/ChatDrawer.astro_astro_type_script_index_0_lang.DFVB6wo8.js">',
      ),
    ).toBe(
      '<link href="/_astro/BaseLayout.[hash].css"><script src="/_astro/ChatDrawer.astro_astro_type_script_index_0_lang.[hash].js">',
    );
  });

  it('keeps image and font names, whose hash comes from the source file', () => {
    const text = '/_astro/card.B5wOgJ7X_27ex34.webp /_astro/overused-grotesk-latin.CEKDkla-.woff2';
    expect(normalizeChunkNames(text)).toBe(text);
  });

  it('keys chunks without their hash and tells them from pages', () => {
    expect(buildKey('_astro/react.DJY1zw8Z.js')).toBe('_astro/react.[hash].js');
    expect(buildKey('proyectos/a.html')).toBe('proyectos/a.html');
    expect(isChunk('_astro/react.DJY1zw8Z.js')).toBe(true);
    expect(isChunk('index.html')).toBe(false);
  });

  it('finds the first line and column where two pages differ', () => {
    expect(firstDifference('a\n<p>same old</p>', 'a\n<p>same new</p>')).toEqual({
      line: 2,
      before: '<p>same old</p>',
      after: '<p>same new</p>',
    });
  });

  it('reports nothing for identical builds', () => {
    const files = { 'index.html': page('<h1>x</h1>') };
    expect(compareBuilds(build(files), build(files))).toEqual({
      onlyInA: [],
      onlyInB: [],
      changed: [],
    });
  });

  it('reports added, removed and changed files, chunks by size', () => {
    const before = build({
      'index.html': page('<h1>x</h1>'),
      'old.html': page(''),
      '_astro/react.[hash].js': { kind: 'chunk', content: 'a', size: 10 },
    });
    const after = build({
      'index.html': page('<h1>y</h1>'),
      'new.html': page(''),
      '_astro/react.[hash].js': { kind: 'chunk', content: 'b', size: 12 },
    });
    expect(compareBuilds(before, after)).toEqual({
      onlyInA: ['old.html'],
      onlyInB: ['new.html'],
      changed: [
        '_astro/react.[hash].js: 10 → 12 bytes',
        'index.html:1\n    - <h1>x</h1>\n    + <h1>y</h1>',
      ],
    });
  });
});
