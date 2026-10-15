import type { ImageMetadata } from 'astro';
import { describe, expect, it } from 'vitest';

import { groupCaptions, groupMedia } from '../../../src/ui/project/media';

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

  it('keeps phone and tablet captures apart from the gallery, in number order', () => {
    const media = groupMedia({
      [`${BASE}/event-platform/gallery-1.webp`]: image('g1'),
      [`${BASE}/event-platform/mobile-2.webp`]: image('m2'),
      [`${BASE}/event-platform/mobile-1.webp`]: image('m1'),
    });

    const event = media.get('event-platform');
    expect(event?.gallery.map((entry) => entry.src.src)).toEqual(['/g1']);
    expect(event?.mobile.map((entry) => entry.slot)).toEqual(['mobile-1', 'mobile-2']);
    expect(media.get('event-platform')?.mobile[0]?.src.src).toBe('/m1');
  });

  it('marks stock photos and lets a real image replace one in the same slot', () => {
    const media = groupMedia({
      [`${BASE}/corporate-portal/cover.stock.webp`]: image('stock-cover'),
      [`${BASE}/corporate-portal/cover.png`]: image('real-cover'),
      [`${BASE}/corporate-portal/gallery-1.stock.webp`]: image('stock-1'),
    });

    const portal = media.get('corporate-portal');
    expect(portal?.cover).toEqual({ src: image('real-cover'), stock: false, slot: 'cover' });
    expect(portal?.gallery).toEqual([{ src: image('stock-1'), stock: true, slot: 'gallery-1' }]);
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

  it('reads captions in both languages and refuses one that is missing a language', () => {
    const captions = groupCaptions({
      [`${BASE}/corporate-portal/captions.json`]: {
        'gallery-1': { es: 'Menú móvil', en: 'Mobile menu' },
      },
    });
    expect(captions.get('corporate-portal')?.['gallery-1']?.en).toBe('Mobile menu');
    expect(
      groupCaptions({
        [`${BASE}/corporate-portal/captions.json`]: {
          'mobile-1': { es: 'Tableta', en: 'Tablet', frame: 'tablet' },
        },
      }).get('corporate-portal')?.['mobile-1']?.frame,
    ).toBe('tablet');
    expect(() =>
      groupCaptions({ [`${BASE}/corporate-portal/captions.json`]: { cover: { es: 'Portada' } } }),
    ).toThrow('"cover" needs a caption in en');
    expect(() =>
      groupCaptions({
        [`${BASE}/corporate-portal/captions.json`]: { cover: { es: 'a', en: 'b', frame: 'tv' } },
      }),
    ).toThrow('unknown frame "tv"');
  });
});
