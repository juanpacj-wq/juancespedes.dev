import type { ImageMetadata } from 'astro';

/*
 * Project images by convention, not by content field: a file dropped in
 * src/assets/projects/<slug>/ is picked up by name (see the README in that folder).
 *
 * - card.*      the screenshot on the home page card; without it the card draws a placeholder.
 * - cover.*     the wide image under the title of the project page.
 * - gallery-N.* more images on the project page, in N order.
 *
 * A `.stock` before the extension (cover.stock.webp) marks a stand-in photo: the page labels it
 * as illustrative, and a real file with the same name wins over it.
 *
 * Images are presentation, so they stay out of the domain and the content schema.
 */

export interface ProjectImage {
  readonly src: ImageMetadata;
  readonly stock: boolean;
}

export interface ProjectMedia {
  readonly card: ProjectImage | null;
  readonly cover: ProjectImage | null;
  readonly gallery: readonly ProjectImage[];
}

const NAME =
  /\/projects\/([a-z0-9-]+)\/(card|cover|gallery-\d+)(\.stock)?\.(?:avif|webp|png|jpe?g)$/;

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
    const image = { src, stock: stock !== undefined };
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
        gallery: [...project]
          .filter(([slot]) => slot.startsWith('gallery-'))
          .sort(([a], [b]) => Number(a.slice(8)) - Number(b.slice(8)))
          .map(([, image]) => image),
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

const NONE: ProjectMedia = { card: null, cover: null, gallery: [] };

export const mediaFor = (slug: string): ProjectMedia => ALL.get(slug) ?? NONE;
