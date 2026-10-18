/*
 * How screenshots are resized and compressed (ProjectGallery, ProjectScreens). Captures are taken
 * at 2x or 3x, and text in them blurs first: the widths reach what a 2x screen needs for the
 * frame each one sits in, and the quality stays above the encoders' defaults (WebP 80, AVIF 50),
 * which smear small type. Astro never enlarges a file past its own width.
 */
export const SCREENSHOT_WIDTHS = {
  /** A browser frame, up to 64rem (1024 px) wide. */
  wide: [640, 960, 1280, 1600, 2048, 2400],
  /**
   * The home page stage: about 900 to 1500 px wide on laptops and desktops, and at least 32rem
   * on phones. Even steps, so the file chosen is near the size it is painted at.
   */
  stage: [720, 1080, 1440, 1800, 2160, 2880],
  /** A phone frame in the gallery, up to 22rem. */
  tall: [360, 540, 720, 1080],
  /** A phone beside others (ProjectScreens), up to 15rem. */
  phone: [300, 480, 720, 960],
  /** A tablet beside the phones, up to 24rem. */
  tablet: [480, 768, 1080, 1536],
} as const;

export const SCREENSHOT_QUALITY = { avif: 68, webp: 86 } as const;
