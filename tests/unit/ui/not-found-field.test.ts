import { describe, expect, it } from 'vitest';

import { RAMP, glyphIndex, sampleMask } from '../../../src/ui/art/not-found-field';

/** An RGBA mask of the given size, inked where `inked(x, y)` says so. */
const mask = (width: number, height: number, inked: (x: number, y: number) => boolean) => {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (inked(x, y)) rgba[(y * width + x) * 4 + 3] = 255;
  }
  return rgba;
};

describe('not found field: glyph ramp', () => {
  it('maps the ends of the scale to the lightest and densest glyphs, and clamps outside', () => {
    expect(glyphIndex(0)).toBe(0);
    expect(glyphIndex(1)).toBe(RAMP.length - 1);
    expect(glyphIndex(-3)).toBe(0);
    expect(glyphIndex(7)).toBe(RAMP.length - 1);
  });

  it('never gets lighter as the level rises', () => {
    const levels = Array.from({ length: 101 }, (_, step) => glyphIndex(step / 100));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe('not found field: sampling a mask', () => {
  it('produces no points from an empty mask', () => {
    const cloud = sampleMask(
      mask(40, 20, () => false),
      40,
      20,
      500,
      0.1,
    );
    expect(cloud.points).toHaveLength(0);
  });

  it('fills the ink with about the requested number of points, inside the shape', () => {
    const width = 200;
    const height = 80;
    const depth = 0.1;
    const cloud = sampleMask(
      mask(width, height, () => true),
      width,
      height,
      4000,
      depth,
    );
    const count = cloud.points.length / 3;

    expect(cloud.halfHeight).toBeCloseTo(height / width);
    expect(count).toBeGreaterThan(4000 * 0.7);
    expect(count).toBeLessThan(4000 * 1.3);
    for (let index = 0; index < count; index += 1) {
      const [x = 0, y = 0, z = 0] = cloud.points.subarray(index * 3, index * 3 + 3);
      // Scattering may reach half a sample step past the edge of the ink.
      expect(Math.abs(x)).toBeLessThan(1.05);
      expect(Math.abs(y)).toBeLessThan(cloud.halfHeight + 0.05);
      expect(Math.abs(z)).toBeLessThanOrEqual(depth);
    }
  });

  it('places points only where the mask is inked', () => {
    const width = 120;
    const height = 40;
    // Only the left half is inked: no point may land far into the right half.
    const cloud = sampleMask(
      mask(width, height, (x) => x < width / 2),
      width,
      height,
      1000,
      0.1,
    );
    const xs = cloud.points.filter((_, index) => index % 3 === 0);

    expect(xs.length).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(0.1);
  });
});
