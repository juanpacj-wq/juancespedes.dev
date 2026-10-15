# 0018. Chiaroscuro: a visual identity with an ASCII painting and visible prices

- Status: accepted
- Date: 2026-10-13
- Amends: [0009](0009-theming-and-design-tokens.md) (token values), the "Direction" of
  `docs/design-system.md`

## Context

The first design met every functional and quality requirement but looked like the generic dark
developer template: near-black, 1 px borders, grey text, a timid accent, a monogram where a photo
should be, and a small mono label above every section. Next to the references the owner
collected it was the least memorable. The owner picked three sites to learn from and asked for
three concrete things: an ASCII-art painting in the hero (Caravaggio's _Narcissus_), the
portrait moved to its own section, and a block that tells a prospect the prices at a glance
without becoming a rigid price list.

The three sites were taken apart with REA (passive Chrome DevTools captures and bundle analysis)
plus headless screenshots and computed styles. Reports, evidence ids, extracted code and
screenshots are kept outside the repository. Findings that shaped this decision:

- good-fella.com draws a famous painting as ASCII with a WebGL post-processing shader: one
  accent colour by default, a radial sweep to the painting's real colours on click. About
  868 kB of gzipped JavaScript; three.js alone is 331 kB.
- schindlertom.com: warm near-black, one cream ink at alpha steps, an ultralight display serif
  over Geist, bevelled "frame and stage" cards with concentric corners, and the pricing block
  the owner liked: "from" on every number, one scope line, short cumulative inclusions, the
  same call to action on every card, the flexibility promise in the subtitle. About 347 kB of
  JavaScript.
- stefanobartoletti.it: an app-window frame, live local time and location in a status bar,
  masked accent glows, a giant faint word. About 622 kB of JavaScript, no reduced-motion
  handling.

This site's budget is 75 kB of JavaScript in total, and it was at 72.3 kB.

## Decision

- **Direction: chiaroscuro.** Caravaggio's tenebrism is the idea that ties the page together: a
  warm near-black ground (`#0e0d0b`), cream ink (`#f2ede4`) and one light, a candle ochre
  (`#e8a33a`) that replaces the old amber. Status uses a verdigris taken from the painting's
  cloth (`#5cc2a8`). The light theme keeps a neutral off-white ground, with the same ochre and
  ink roles.
- **Type: Literata for display, Geist for text, Geist Mono for data.** Headlines and section
  titles are a light serif, chosen over the reflex choices (Instrument Serif, Fraunces,
  Playfair) after a side-by-side render with Bodoni Moda, Source Serif 4 and EB Garamond.
  Literata is OFL; it is instanced to the display optical size and weights 300 to 500 and
  subset to Latin: 43 kB instead of 110 kB, preloaded.
- **The ASCII painting is text, not WebGL.** `scripts/generate-ascii.mjs` (sharp) turns a
  1200 px copy of the painting into a 240 x 92 grid once: a
  percentile stretch, an empty floor for the dark ground, a gamma that lifts the half-lit paint,
  and one glyph per tone chosen by the share of the cell that Geist Mono inks at weight 600,
  measured on a canvas. The grid is committed. A first version (96 columns, histogram
  equalization, a random glyph within each density class) lost the silhouette: the texture
  read as noise, so it was replaced. `AsciiArt.astro` stacks two copies
  of the text: ochre ink, and the same characters filled with a 192 px copy of the painting
  (`background-clip: text`). A lamp follows a fine pointer and shows the true colours around
  it; a click or the labelled switch floods the whole figure with them. The figure is the backdrop of
  the hero and the content stands centred in front of it, dimmed by a pool of shadow and a halo
  on the text. The copy is cropped at the waterline, without the reflection: Narcissus bends
  over the page, and the work below is what holds his gaze. Without the reflection the painting
  is close to the shape of a screen (1.56 : 1), so it covers the whole first screen, the header
  included: the hero slides up under the sticky bar, which starts clear and turns solid as the
  page scrolls (a CSS scroll timeline; without one it stays solid). The figure is drawn 10 %
  wider than the screen so the arms, not the painting's dark margins, reach both edges; the
  overflow is cut from the empty top band and from the bottom, where it fades into the next
  section. Masks and registered
  custom properties do the animation; the script is under 1 kB and inline. At rest both layers are
  plain text: the masks apply only while the lamp or the light is in use, and the colour layer
  is not painted until then. An entrance animation that recomputed a mask on every frame over
  the full-screen backdrop cost the home page its Lighthouse budget, so it was removed. Screen readers get one
  image with a description, and the caption credits the painting.
- **Portrait in its own section.** "Quién está detrás" holds the portrait, a short first-person
  text, the location and the live local time in Barranquilla (an idea from the status bar of
  the third reference). The portrait still falls back to a monogram until a photo is dropped
  in `src/assets/photos/`.
- **Services carry their starting price.** Each service has `price.from`, a one-line
  `price.scope` and an optional `featured` flag, validated by the content schema; amounts are
  in pesos on the Spanish site and in dollars on the English one, formatted with `Intl`. The
  cards follow the reference's anatomy, and the featured service inverts ink and canvas, which
  works in both themes without another colour. The note under the cards states that every
  amount is a starting point and that the final price is fixed in writing. The amounts live in
  `content/profile/*.yaml`, so changing them needs no code. The chat corpus includes them.
  Amended 2026-10-15: `price.from` may be `null` for a service quoted per requirement (custom
  applications); its card shows "Por cotización" / "Custom quote" in place of the amount.
- **New primitives and tokens.** `Frame` (frame and stage with concentric radii and a bevel
  instead of a border), `shadow-bevel`, `shadow-glow`, `frame`, `ascii`, `radius-frame`,
  `radius-stage`, `text-quote`, `text-price`, `font-display`. Buttons become pills that scale
  slightly on hover and press. Cards lose their border for the bevel.
- **No label above every section.** The home sections drop their mono eyebrows; the serif
  title carries the section. Numbers remain only where order means something (the process).
- **Reveals are progressive.** `.reveal` uses a scroll-driven `view()` timeline inside
  `@supports` and `prefers-reduced-motion: no-preference`, so content is visible by default in
  every other case.

## Consequences

- JavaScript stays at 72.4 kB of the 75 kB budget: the new behaviour is inline script and CSS.
- Pages download one more font file (43 kB) and the home page a 192 px WebP; the ASCII text is
  about 22 kB and travels once: the colour layer copies it from the ink the first time the lamp
  or the light is used. The home page has no slack in its performance budget, so the backdrop
  text, which is its largest paint, must not grow without measuring again. Its scoped styles
  (hero and art) must also stay under 4 kB, the limit below which Astro inlines them: above it
  they become one more render-blocking stylesheet, which alone cost 0.3 s of first paint.
- The prices are public commitments to a floor. They are set in content, reviewed like any
  other copy, and must be kept current.
- Changing the painting or the grid size means running `pnpm ascii` and committing the output;
  a test checks that the grid stays rectangular and keeps the painting's proportions.
- The light colour flood depends on `background-clip: text` and CSS masks; without them the
  ochre ink still shows the whole painting.
