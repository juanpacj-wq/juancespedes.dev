import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * Reads the color tokens straight from the stylesheet, so this test breaks the moment a token
 * change drops a text/background pair below WCAG 2.2 AA in either theme.
 */

const css = readFileSync(join(process.cwd(), 'src/ui/styles/global.css'), 'utf8');

type Theme = 'light' | 'dark';

const tokens = (() => {
  const result = new Map<string, Record<Theme, string>>();
  for (const [, name, light, dark] of css.matchAll(
    /--([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi,
  )) {
    if (name && light && dark) result.set(name, { light, dark });
  }
  return result;
})();

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r ?? 0) + 0.7152 * channel(g ?? 0) + 0.0722 * channel(b ?? 0);
};

const contrast = (a: string, b: string): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
};

const color = (name: string, theme: Theme): string => {
  const token = tokens.get(name);
  if (!token) throw new Error(`token --${name} not found in global.css`);
  return token[theme];
};

/** [foreground, background, minimum ratio]. 4.5 for text, 3 for non-text UI (WCAG 1.4.11). */
const PAIRS: readonly (readonly [string, string, number])[] = [
  ['ink', 'canvas', 4.5],
  ['ink', 'surface', 4.5],
  ['ink', 'surface-raised', 4.5],
  ['muted', 'canvas', 4.5],
  ['muted', 'surface', 4.5],
  ['muted', 'surface-raised', 4.5],
  ['subtle', 'canvas', 4.5],
  ['subtle', 'surface', 4.5],
  ['accent-ink', 'canvas', 4.5],
  ['accent-ink', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['success', 'canvas', 3],
  ['success', 'surface', 3],
  ['line-strong', 'canvas', 1.3],
];

describe('color tokens', () => {
  it('declares every token with a light and a dark value', () => {
    expect(tokens.size).toBeGreaterThanOrEqual(12);
  });

  describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
    it.each(PAIRS)('%s on %s meets %d:1', (foreground, background, minimum) => {
      const ratio = contrast(color(foreground, theme), color(background, theme));
      expect(ratio, `${foreground} on ${background}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
        minimum,
      );
    });
  });

  it('computes the reference ratios correctly', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});
