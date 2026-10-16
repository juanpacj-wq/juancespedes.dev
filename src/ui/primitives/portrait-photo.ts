import type { ImageMetadata } from 'astro';

/**
 * The owner's photo, when src/assets/photos/portrait.{jpg,jpeg,png,webp} exists. Shared by
 * Portrait and the about section, which only gives the photo a column once there is one.
 */
const photos = import.meta.glob<{ default: ImageMetadata }>(
  '../../assets/photos/portrait.{jpg,jpeg,png,webp}',
  { eager: true },
);

export const portraitPhoto: ImageMetadata | undefined = Object.values(photos)[0]?.default;
