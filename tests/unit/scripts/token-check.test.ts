import { describe, expect, it } from 'vitest';

import { findRawValues } from '../../../scripts/lib/token-check.mjs';

describe('token check', () => {
  it.each([
    'class="bg-[#ff0000]"',
    'style="color: #fff"',
    'background: rgb(0 0 0)',
    'color: oklch(0.7 0.1 30)',
    'class="p-[13px]"',
    'class="-mt-[2rem]"',
    'class="text-[1.1rem]"',
  ])('flags %s', (line) => {
    expect(findRawValues(line)).toHaveLength(1);
  });

  it.each([
    'class="bg-canvas text-muted rounded-card"',
    'class="transition-[color,transform] duration-150"',
    'class="supports-[backdrop-filter]:bg-canvas/70"',
    'class="aspect-4/5"',
    'class="lg:grid-cols-[1fr_22rem]"',
    'class="w-[min(100%,40rem)]"',
    '<a href="#main">',
    'background: var(--color-line);',
  ])('accepts %s', (line) => {
    expect(findRawValues(line)).toEqual([]);
  });

  it('honours a tokens-allow comment on the same or the previous line', () => {
    expect(findRawValues('<meta content="#000000" /> <!-- tokens-allow: meta -->')).toEqual([]);
    expect(findRawValues('<!-- tokens-allow: meta -->\n<meta content="#000000" />')).toEqual([]);
  });

  it('reports the line number', () => {
    expect(findRawValues('ok\nclass="p-[13px]"')).toEqual([{ line: 2, match: 'p-[13px]' }]);
  });
});
