import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { groupMedia } from '../../../src/ui/project/media';

const image = (name: string): ImageMetadata => ({
  src: `/${name}`,
  width: 1600,
  height: 1000,
  format: 'webp',
});

const BASE = '../../assets/projects';

describe('project media', () => {
  it('groups images by project and slot, with the gallery in number order', () => {
    const media = groupMedia({
      [`${BASE}/plant-telemetry/cover.webp`]: image('cover'),
      [`${BASE}/plant-telemetry/gallery-10.png`]: image('g10'),
      [`${BASE}/plant-telemetry/gallery-2.jpg`]: image('g2'),
      [`${BASE}/plant-telemetry/card.avif`]: image('card'),
      [`${BASE}/event-platform/gallery-1.webp`]: image('other'),
    });

    const telemetry = media.get('plant-telemetry');
    expect(telemetry?.card?.src.src).toBe('/card');
    expect(telemetry?.cover?.src.src).toBe('/cover');
    expect(telemetry?.gallery.map((entry) => entry.src.src)).toEqual(['/g2', '/g10']);
    expect(media.get('event-platform')?.cover).toBeNull();
  });

  it('marks stock photos and lets a real image replace one in the same slot', () => {
    const media = groupMedia({
      [`${BASE}/corporate-portal/cover.stock.webp`]: image('stock-cover'),
      [`${BASE}/corporate-portal/cover.png`]: image('real-cover'),
      [`${BASE}/corporate-portal/gallery-1.stock.webp`]: image('stock-1'),
    });

    const portal = media.get('corporate-portal');
    expect(portal?.cover).toEqual({ src: image('real-cover'), stock: false });
    expect(portal?.gallery).toEqual([{ src: image('stock-1'), stock: true }]);
  });

  it('keeps the real image whatever order the files are found in', () => {
    const media = groupMedia({
      [`${BASE}/corporate-portal/cover.png`]: image('real-cover'),
      [`${BASE}/corporate-portal/cover.stock.webp`]: image('stock-cover'),
    });
    expect(media.get('corporate-portal')?.cover?.stock).toBe(false);
  });

  it('ignores files that do not follow the naming convention', () => {
    const media = groupMedia({
      [`${BASE}/plant-telemetry/README.md`]: image('readme'),
      [`${BASE}/plant-telemetry/screenshot.png`]: image('loose'),
      [`${BASE}/Bad_Slug/cover.png`]: image('bad'),
    });
    expect(media.size).toBe(0);
  });
});
