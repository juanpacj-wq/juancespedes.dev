import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * The hero's ASCII painting is generated once and committed (scripts/generate-ascii.mjs). The
 * component sizes the text from its column count and stretches the painting over the same box,
 * so every line must have the same width and the grid must keep the painting's proportions.
 */
const text = readFileSync(join(process.cwd(), 'src/assets/art/narcissus.txt'), 'utf8');
const lines = text.replace(/\n+$/, '').split('\n');
const columns = lines[0]?.length ?? 0;

describe('the ASCII painting', () => {
  it('is a rectangular grid', () => {
    expect(columns).toBeGreaterThan(40);
    for (const line of lines) expect(line).toHaveLength(columns);
  });

  it('keeps the proportions of the painting (1200 x 770) for cells 0.6 wide', () => {
    const ratio = (columns * 0.6) / lines.length;
    expect(ratio).toBeCloseTo(1200 / 770, 1);
  });

  it('uses printable ASCII only, so any monospace font draws every cell', () => {
    expect(text).toMatch(/^[\x20-\x7e\n]+$/);
  });

  it('leaves the dark ground empty and draws the figure', () => {
    const cells = lines.join('');
    const drawn = cells.replace(/ /g, '').length / cells.length;
    expect(drawn).toBeGreaterThan(0.2);
    expect(drawn).toBeLessThan(0.7);
  });
});
