# 0020. The 404 as a reflection: a "404" solid drawn in ASCII, mirrored under a waterline

- Status: accepted
- Date: 2026-10-13
- Amends: [0018](0018-chiaroscuro-redesign.md) (the art primitives)

## Context

The 404 page was a column of text in both languages: correct, but the one page every broken link
lands on said nothing about the site around it. The owner pointed at the 404 of andabove.com
and asked for an appropriate one for this portfolio.

The reference was taken apart from its served HTML, CSS and JavaScript (a Nuxt build). Copies are
kept outside the repository. Findings:

- **Stage.** The first screen is a stage on charcoal: a particle field behind a scrim, and the
  words anchored at the foot, on the left. One heading in two tones ("Page not found" in the brand
  orange, the explanation in chalk) and a pill button home. Footer below.
- **Field.** A three.js scene of 12,000 points. The shape is a dedicated `404` geometry: 10,000
  points baked as base64 floats in a lazy chunk, the digits extruded to a thin solid (x from -2.5
  to 2.5, depth 0.46). It is posed by the `error-tilted-large` profile (scale 2.25, pitch -0.43,
  roll 0.33), coloured with one brand orange, drawn through a `dither-fine` post filter (the
  same engine has an `ascii` mode), and stirred by curl noise. The pointer leaves a wake.
- **Scrim.** A soft orange radial glow behind the shape and a vertical fade to the ground, so the
  words read over the field.
- **Cost.** About 520 kB of JavaScript on the page, most of it three.js and the particle engine.
  This site's budget is 75 kB for everything, at 73.0 kB before this change.

## Decision

Take the stage, the solid, the pose and the wake; draw them in this site's language.

- **The field is text.** The display font's "404" is rasterised once at load and sampled into a
  cloud of about 7,000 points with random depth, so no geometry is shipped. Each frame the cloud
  sways, breathes (a cheap stand-in for curl noise), is projected with a lean back and a slight
  tilt, and is binned into character cells; each cell becomes a glyph from the coverage ramp
  measured for the Narcissus painting, in the `ascii` ink. Nearer points weigh more, so the
  front reads denser. A 2D canvas and no library.
- **The reflection.** Below a waterline, the solid is mirrored in thin strips that fade and sway.
  The home crops Narcissus above the water, without his reflection (ADR 0018); the 404 is where
  only the reflection is left, which is what a missing page is. The solid stands on the top edge
  of the words (`data-field-floor`), so only the dim reflection passes under them, and a scrim
  in tokens (ochre glow, fall to the canvas) keeps them readable.
- **Words.** The same dictionary strings. Spanish carries the page: the title in the display serif
  and the ochre ink, the explanation in lead size, the primary button. English sits beside it on
  wide screens and below it on phones, each block with its `lang`.
- **Interaction and motion.** The wake follows a mouse or a pen, never touch (the same rule as the
  home lamp). Under reduced motion the field is drawn once and never moves; the canvas follows
  theme changes and resizes in both cases. It is `aria-hidden`: the page says the same in words.
- **Cost.** The script is 1.9 kB gzip and Astro inlines it into the 404 page (under its 4 kB
  inline limit), so no other page loads it and the site bundle stays at 73.0 kB; were it ever
  emitted as a chunk, it would still fit the budget. Frames run at 25 per second while the pointer
  moves and 12 at rest. In headless Chromium with software rasterising (a pessimistic meter) the
  main thread stays about 80 % idle at rest.

## Consequences

- Measuring changed the design twice. Copying the reflection from the canvas onto itself made the
  browser snapshot the whole canvas for every strip and pinned the main thread at 99 %: the
  reflection now copies once per frame into a scratch canvas. A glyph atlas turned out slower
  than `fillText` for single glyphs, so glyphs are drawn directly. `Math.hypot` in the per-point
  loop was replaced with `Math.sqrt`.
- The script has to stay small. Its state lives in local variables (the minifier shortens those,
  not object properties). Past about 4 kB minified Astro stops inlining it, and it then counts
  toward the 75 kB budget.
- The field depends on canvas and on the fonts loading. Without them the stage is the scrim and
  the words, which carry the whole message.
- The 404 page is not measured by Lighthouse in CI (only `/` and `/en` are). Its performance
  rests on the numbers above and on the e2e tests that check it draws, stays still under reduced
  motion and stays out of the accessibility tree.
