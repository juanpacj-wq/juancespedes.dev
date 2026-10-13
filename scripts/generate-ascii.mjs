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

const COLUMNS = 96;
/** A monospace cell is about 0.6 wide for each 1 of height (line-height 1). */
const CELL_ASPECT = 0.6;
/**
 * Density classes, darkest to brightest: bright paint becomes dense characters. Each cell picks
 * one character of its class at random (seeded, so the output is stable between runs), which
 * keeps the texture alive instead of repeating one glyph per tone.
 */
const RAMP = [
  ' ',
  ".,'`",
  ':;-~',
  '=+^*',
  'ilrtvxz',
  'cesnuao',
  'CUJYQ0O',
  'dbpqkhZ',
  '#%&8BG',
  '@WM$N',
];
/** Mulberry32: a tiny deterministic generator. */
let seed = 1599; // the year Caravaggio is thought to have finished the painting
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/**
 * Below this (equalized) luminance a cell stays empty: about half the canvas is Caravaggio's dark
 * ground, and leaving it as space is what makes the figure read.
 */
const FLOOR = 0.5;
const GAMMA = 1.1;

const { width = 1, height = 1 } = await sharp(SOURCE).metadata();
const rows = Math.round(((COLUMNS * height) / width) * CELL_ASPECT);

const { data } = await sharp(SOURCE)
  .greyscale()
  .sharpen({ sigma: 1.2 })
  .resize(COLUMNS, rows, { fit: 'fill', kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });

// Histogram equalization over the grid: Caravaggio's ground is nearly black, so a linear map
// would leave the figure in a handful of characters. Equalizing spreads the ramp over the paint.
/** @type {number[]} */
const histogram = new Array(256).fill(0);
for (const value of data) histogram[value] = (histogram[value] ?? 0) + 1;
/** @type {number[]} */
const cumulative = [];
let running = 0;
for (const count of histogram) cumulative.push((running += count));
/** @param {number} value */
const equalized = (value) => (cumulative[value] ?? 0) / data.length;

const lines = [];
for (let y = 0; y < rows; y += 1) {
  let line = '';
  for (let x = 0; x < COLUMNS; x += 1) {
    // A soft elliptical vignette fades the canvas texture near the edges.
    const radius = Math.hypot((x / COLUMNS - 0.5) * 2, (y / rows - 0.5) * 2) / Math.SQRT2;
    const vignette = 1 - (0.6 * Math.max(0, radius - 0.55)) / 0.45;
    const value = equalized(data[y * COLUMNS + x] ?? 0) * vignette;
    const level = value < FLOOR ? 0 : ((value - FLOOR) / (1 - FLOOR)) ** GAMMA;
    const glyphs = RAMP[Math.min(RAMP.length - 1, Math.floor(level * RAMP.length))] ?? ' ';
    line += glyphs[Math.floor(random() * glyphs.length)];
  }
  lines.push(line);
}

writeFileSync(OUT, `${lines.join('\n')}\n`);
console.log(`ascii: ${String(COLUMNS)} x ${String(rows)} written to ${OUT}`);
