#!/usr/bin/env node
// Turns src/assets/art/narcissus.jpg (Caravaggio, public domain) into the ASCII grid that the
// home hero renders as text. The output is committed, so a build never depends on this script;
// run it again only after changing the source image or the settings below (pnpm ascii).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'src', 'assets', 'art', 'narcissus.jpg');
const OUT = join(ROOT, 'src', 'assets', 'art', 'narcissus.txt');

/** Enough columns for the arms, the face and the reflection to keep their outline. */
const COLUMNS = 160;
/** A monospace cell is about 0.6 wide for each 1 of height (line-height 1). */
const CELL_ASPECT = 0.6;
/**
 * Glyphs and the share of their cell that Geist Mono inks at weight 600 (the weight the hero
 * draws the art with), measured by rendering each one to a canvas. A tone maps to the glyph whose
 * coverage is nearest, so the drawing keeps the painting's values: a ramp ordered by eye puts
 * light glyphs in dark places (the tilde inks less than the semicolon) and the silhouette blurs.
 */
/** @type {ReadonlyArray<readonly [string, number]>} */
const GLYPHS = [
  [' ', 0],
  ['.', 0.034],
  ['-', 0.065],
  [':', 0.068],
  ['~', 0.087],
  [';', 0.088],
  ['^', 0.111],
  ['!', 0.123],
  ['=', 0.148],
  ['+', 0.151],
  ['*', 0.16],
  ['<', 0.163],
  ['(', 0.18],
  ['v', 0.205],
  ['r', 0.208],
  ['x', 0.21],
  ['t', 0.213],
  ['c', 0.224],
  ['n', 0.235],
  ['s', 0.247],
  ['o', 0.254],
  ['a', 0.268],
  ['e', 0.272],
  ['k', 0.275],
  ['w', 0.291],
  ['X', 0.294],
  ['Z', 0.302],
  ['p', 0.312],
  ['%', 0.314],
  ['#', 0.318],
  ['m', 0.321],
  ['S', 0.338],
  ['D', 0.344],
  ['G', 0.351],
  ['R', 0.357],
  ['@', 0.366],
  ['N', 0.37],
  ['8', 0.371],
  ['Q', 0.378],
  ['B', 0.383],
  ['&', 0.385],
  ['$', 0.391],
  ['W', 0.405],
  ['M', 0.417],
];
const DENSEST = 0.417;
/** @param {number} level 0 (empty) to 1 (densest) */
const glyphFor = (level) => {
  const target = level * DENSEST;
  let best = ' ';
  let distance = Infinity;
  for (const [glyph, coverage] of GLYPHS) {
    if (Math.abs(coverage - target) < distance) {
      best = glyph;
      distance = Math.abs(coverage - target);
    }
  }
  return best;
};
/** Below this (stretched) luminance a cell stays empty: Caravaggio's ground is the page. */
const FLOOR = 0.14;
/** Under 1 lifts the half-lit paint (the face, the reflection) towards denser glyphs. */
const GAMMA = 0.7;
/** The darkest and brightest percentiles that the stretch maps to 0 and 1. */
const LOW = 0.02;
const HIGH = 0.995;

const { width = 1, height = 1 } = await sharp(SOURCE).metadata();
const rows = Math.round(((COLUMNS * height) / width) * CELL_ASPECT);

const { data } = await sharp(SOURCE)
  .greyscale()
  .resize(COLUMNS, rows, { fit: 'fill', kernel: 'lanczos3' })
  .sharpen({ sigma: 0.6 })
  .raw()
  .toBuffer({ resolveWithObject: true });

// A percentile stretch, so a few specular highlights don't decide where the ramp ends.
const sorted = Uint8Array.from(data).sort();
const low = sorted[Math.floor(sorted.length * LOW)] ?? 0;
const high = sorted[Math.floor(sorted.length * HIGH)] ?? 255;

const lines = [];
for (let y = 0; y < rows; y += 1) {
  let line = '';
  for (let x = 0; x < COLUMNS; x += 1) {
    const value = Math.min(1, Math.max(0, ((data[y * COLUMNS + x] ?? 0) - low) / (high - low)));
    const level = value < FLOOR ? 0 : ((value - FLOOR) / (1 - FLOOR)) ** GAMMA;
    line += glyphFor(level);
  }
  lines.push(line);
}

writeFileSync(OUT, `${lines.join('\n')}\n`);
console.log(`ascii: ${String(COLUMNS)} x ${String(rows)} written to ${OUT}`);
