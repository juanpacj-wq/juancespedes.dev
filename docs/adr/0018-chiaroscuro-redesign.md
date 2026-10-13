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
  1200 px copy of the painting into a 96 x 70 grid once: histogram equalization, an empty
  floor for the dark ground, a soft vignette, and a random pick within each density class
  (seeded, so the output is stable). The grid is committed. `AsciiArt.astro` stacks two copies
  of the text: ochre ink, and the same characters filled with a 192 px copy of the painting
  (`background-clip: text`). A lamp follows a fine pointer and shows the true colours around
  it; a click or the labelled switch floods the whole figure with them. Masks and registered
  custom properties do the animation; the script is under 1 kB and inline. The ink develops
  outward on first paint unless the visitor prefers reduced motion. Screen readers get one
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
  about 7 kB of HTML.
- The prices are public commitments to a floor. They are set in content, reviewed like any
  other copy, and must be kept current.
- Changing the painting or the grid size means running `pnpm ascii` and committing the output;
  a test checks that the grid stays rectangular and keeps the painting's proportions.
- The light colour flood depends on `background-clip: text` and CSS masks; without them the
  ochre ink still shows the whole painting.
