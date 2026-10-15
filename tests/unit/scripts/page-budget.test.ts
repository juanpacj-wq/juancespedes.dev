import { describe, expect, it } from 'vitest';

import { pageProblems } from '../../../scripts/lib/page-budget.mjs';

const SHARED = '<link rel="stylesheet" href="/_astro/BaseLayout.Ab12_c.css">';
const page = (head: string, body: string) =>
  `<!doctype html><html><head>${SHARED}${head}</head><body>${body}</body></html>`;

describe('page budget', () => {
  it('accepts the shared stylesheet, first-screen images and deferred ones', () => {
    const html = page(
      '<style>.a{}</style>',
      '<picture><source type="image/avif" srcset="/c.avif 640w"><img src="/c.png" loading="eager"></picture>' +
        '<picture><source type="image/avif" data-srcset="/g.avif 640w"><img data-deferred data-src="/g.webp" alt="x"></picture>' +
        '<noscript><img src="/g.webp" loading="lazy" alt="x"><link rel="stylesheet" href="/_astro/x.css"></noscript>',
    );
    expect(pageProblems(html, '/', 30).problems).toEqual([]);
  });

  it('reports a render-blocking stylesheet other than the shared one', () => {
    const html = page('<link rel="stylesheet" href="/_astro/ProjectView.D9.css">', '');
    expect(pageProblems(html, '/p', 30).problems).toEqual([
      '/p: render-blocking stylesheet /_astro/ProjectView.D9.css (keep it under 4 kB or load it later)',
    ]);
  });

  it('reports images that download with the page, lazy or not', () => {
    const html = page(
      '',
      '<img src="/card.webp" loading="lazy" alt="">' +
        '<picture><source srcset="/g.avif 640w"><img src="/g.png" alt=""></picture>',
    );
    const { problems } = pageProblems(html, '/p', 30);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('/card.webp downloads with the page');
    expect(problems[1]).toContain('/g.avif downloads with the page');
  });

  it('reports HTML over its compressed budget', () => {
    // Random text barely compresses: about 3 kB stays about 3 kB.
    let seed = 7;
    const noise = Array.from({ length: 3000 }, () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return String.fromCharCode(33 + (seed % 90));
    }).join('');
    const { kb, problems } = pageProblems(page('', `<p>${noise}</p>`), '/p', 1);
    expect(kb).toBeGreaterThan(1);
    expect(problems.at(-1)).toMatch(/^\/p: HTML .* kB > 1 kB \(Brotli\)$/);
  });
});
