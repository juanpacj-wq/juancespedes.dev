import type { ImageMetadata } from 'astro';

import type { Locale } from '../../domain/shared/locale';

/*
 * Project images by convention, not by content field: a file dropped in
 * src/assets/projects/<slug>/ is picked up by name (see the README in that folder).
 *
 * - card.*      the screenshot on the home page card; without it the card draws a placeholder.
 * - cover.*     the wide image under the title of the project page.
 * - gallery-N.* more images on the project page, in N order.
 * - mobile-N.*  the same product on phones and tablets, shown together to prove it is responsive.
 *
 * A `.stock` before the extension (cover.stock.webp) marks a stand-in photo. Project pages skip
 * stand-ins and draw the app window instead (ADR 0021); a real file with the same name wins.
 *
 * - captions.json says what each image shows, in both languages: { "gallery-1": { "es", "en" } },
 *   plus an optional "frame" (browser, phone, tablet or none). The caption is also the image's
 *   text alternative, so a real screenshot needs one. Its "responsive" entry introduces the
 *   mobile-N captures.
 *
 * Images are presentation, so they stay out of the domain and the content schema.
 */

export interface ProjectImage {
  readonly src: ImageMetadata;
  readonly stock: boolean;
  /** The file name without extension: card, cover, gallery-1, mobile-1... */
  readonly slot: string;
}

/** Where a screenshot is shown: a browser window, a phone, a tablet, or as is (it brings its own
 * window). */
export type Frame = 'browser' | 'phone' | 'tablet' | 'none';

export interface Caption {
  readonly es: string;
  readonly en: string;
  /** Without it, the frame follows the shape: tall images are phones, wide ones browsers. */
  readonly frame: Frame | null;
}

export type Captions = Readonly<Record<string, Caption>>;

const FRAMES: readonly Frame[] = ['browser', 'phone', 'tablet', 'none'];

export interface ProjectMedia {
  readonly card: ProjectImage | null;
  readonly cover: ProjectImage | null;
  readonly gallery: readonly ProjectImage[];
  /** Captures on phones and tablets, in N order. */
  readonly mobile: readonly ProjectImage[];
}

const NAME =
  /\/projects\/([a-z0-9-]+)\/(card|cover|gallery-\d+|mobile-\d+)(\.stock)?\.(?:avif|webp|png|jpe?g)$/;

/** The images whose slot is `<prefix>N`, in N order. */
const numbered = (project: ReadonlyMap<string, ProjectImage>, prefix: string): ProjectImage[] =>
  [...project]
    .filter(([slot]) => slot.startsWith(prefix))
    .sort(([a], [b]) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)))
    .map(([, image]) => image);

/** Groups glob entries (path to image) by project slug. Exported for tests. */
export const groupMedia = (
  entries: Readonly<Record<string, ImageMetadata>>,
): ReadonlyMap<string, ProjectMedia> => {
  const slots = new Map<string, Map<string, ProjectImage>>();
  for (const [path, src] of Object.entries(entries)) {
    const match = NAME.exec(path);
    if (!match) continue;
    const [, slug = '', slot = '', stock] = match;
    const project = slots.get(slug) ?? new Map<string, ProjectImage>();
    const image = { src, stock: stock !== undefined, slot };
    // A real image always replaces a stock one in the same slot.
    if (!project.get(slot) || project.get(slot)?.stock) project.set(slot, image);
    slots.set(slug, project);
  }
  return new Map(
    [...slots].map(([slug, project]) => [
      slug,
      {
        card: project.get('card') ?? null,
        cover: project.get('cover') ?? null,
        gallery: numbered(project, 'gallery-'),
        mobile: numbered(project, 'mobile-'),
      },
    ]),
  );
};

const ALL = groupMedia(
  import.meta.glob<ImageMetadata>('../../assets/projects/*/*.{avif,webp,png,jpg,jpeg}', {
    eager: true,
    import: 'default',
  }),
);

const NONE: ProjectMedia = { card: null, cover: null, gallery: [], mobile: [] };

export const mediaFor = (slug: string): ProjectMedia => ALL.get(slug) ?? NONE;

const CAPTIONS_FILE = /\/projects\/([a-z0-9-]+)\/captions\.json$/;
const LOCALES: readonly Locale[] = ['es', 'en'];

/**
 * Reads every project's captions.json. A caption must exist in both languages: a missing one
 * stops the build instead of publishing an image without its text. Exported for tests.
 */
export const groupCaptions = (
  entries: Readonly<Record<string, unknown>>,
): ReadonlyMap<string, Captions> => {
  const all = new Map<string, Captions>();
  for (const [path, data] of Object.entries(entries)) {
    const slug = CAPTIONS_FILE.exec(path)?.[1];
    if (!slug) continue;
    if (typeof data !== 'object' || data === null) throw new Error(`${path}: expected an object`);
    const captions: Record<string, Caption> = {};
    for (const [slot, value] of Object.entries(data)) {
      const text = (value ?? {}) as Partial<Record<string, unknown>>;
      const missing = LOCALES.filter((locale) => {
        const caption = text[locale];
        return typeof caption !== 'string' || caption.trim() === '';
      });
      if (missing.length > 0) {
        throw new Error(`${path}: "${slot}" needs a caption in ${missing.join(' and ')}`);
      }
      const frame = text.frame ?? null;
      if (frame !== null && !FRAMES.includes(frame as Frame)) {
        throw new Error(`${path}: "${slot}" has an unknown frame ${JSON.stringify(frame)}`);
      }
      captions[slot] = {
        es: text.es as string,
        en: text.en as string,
        frame: frame as Frame | null,
      };
    }
    all.set(slug, captions);
  }
  return all;
};

const CAPTIONS = groupCaptions(
  import.meta.glob('../../assets/projects/*/captions.json', { eager: true, import: 'default' }),
);

/** What an image shows, in the page's language, or null when it has no caption. */
export const captionFor = (slug: string, slot: string, locale: Locale): string | null =>
  CAPTIONS.get(slug)?.[slot]?.[locale] ?? null;

/** The frame an image is shown in: the one its caption asks for, or one that fits its shape. */
export const frameFor = (slug: string, image: ProjectImage): Frame =>
  CAPTIONS.get(slug)?.[image.slot]?.frame ??
  (image.src.height > image.src.width ? 'phone' : 'browser');
