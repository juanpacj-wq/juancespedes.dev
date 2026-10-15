// What made the Lighthouse budget fail before, read from a built page (scripts/check-pages.mjs,
// docs/runbooks/deploy-friction.md):
//
// - a render-blocking stylesheet other than the shared one (a page sheet above 4 kB is linked in
//   <head> instead of inlined: +600 ms of FCP on the case study);
// - an image with an address that is not declared part of the first screen (`loading="eager"`):
//   `loading="lazy"` does not stop the browser's look-ahead (about 2500 px on slow connections)
//   from downloading it, so images below the first screen keep their address in data attributes
//   (data-src, data-srcset) until a script needs them;
// - HTML heavier than its budget, compressed with Brotli as Cloudflare and the CI meter serve it.
import { brotliCompressSync, constants } from 'node:zlib';

const SHARED_SHEET = /\/BaseLayout\.[\w-]+\.css$/;

/**
 * Compressed size in kB, at the quality the CI meter (scripts/preview-compressed.mjs) uses.
 * @param {string} html
 */
export const compressedKb = (html) =>
  brotliCompressSync(html, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length / 1024;

/**
 * The problems of one built page; `path` only labels them.
 * @param {string} html
 * @param {string} path
 * @param {number} budgetKb
 * @returns {{ kb: number, problems: string[] }}
 */
export const pageProblems = (html, path, budgetKb) => {
  // What a browser without JavaScript would add is not part of the page as loaded.
  const page = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const end = page.indexOf('</head>');
  const head = end === -1 ? '' : page.slice(0, end);
  /** @type {string[]} */
  const problems = [];

  for (const [tag] of head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)) {
    const href = /href="([^"]+)"/.exec(tag)?.[1] ?? '';
    if (!SHARED_SHEET.test(href)) {
      problems.push(
        `${path}: render-blocking stylesheet ${href} (keep it under 4 kB or load it later)`,
      );
    }
  }

  // A <picture> counts as one image: its <img> says whether it belongs to the first screen.
  for (const [image] of page.matchAll(/<picture\b[\s\S]*?<\/picture>|<img\b[^>]*>/g)) {
    const hasAddress = /\s(?:src|srcset)="[^"]/.test(image);
    if (hasAddress && !/\sloading="eager"/.test(image)) {
      const name = /\s(?:src|srcset)="([^"\s]+)/.exec(image)?.[1] ?? image.slice(0, 60);
      problems.push(
        `${path}: image ${name} downloads with the page (first screen: loading="eager"; below it: data-src/data-srcset)`,
      );
    }
  }

  const kb = compressedKb(html);
  if (kb > budgetKb) {
    problems.push(`${path}: HTML ${kb.toFixed(1)} kB > ${String(budgetKb)} kB (Brotli)`);
  }
  return { kb, problems };
};
