# 0031. Fragment Mono replaces Geist Mono

- Status: accepted
- Date: 2026-10-16
- Amends: [0030](0030-overused-grotesk.md) (the mono face)

## Context

ADR 0030 changed the text face and kept Geist Mono for data, labels and the hero's ASCII painting.
The owner pointed out that Geist Mono is the mono an assistant reaches for in every project: it is
Vercel's face, the default of `create-next-app`, and the second most used font in the 2026 ranking
ADR 0030 read. On this site it came from the first scaffold, not from a design decision.

Six open-source monos were rendered in the site's palette with its real labels, figures and a
slice of the painting: Fragment Mono, Azeret Mono, Spline Sans Mono, Commit Mono, Sometype Mono
and Reddit Mono. Commit and Spline read almost like Geist; Azeret is wide and technical. JetBrains
Mono and Martian Mono, next in the ranking, were left out for the same reason as Geist.

## Decision

- **Fragment Mono** (Wei Huang, OFL 1.1) sets every mono text. It is a Helvetica-derived mono, so
  it shares the grotesk drawing of Overused Grotesk instead of the coding-font look.
- **One weight.** The face has only Regular: mono text drops `font-medium`, the ASCII painting is
  drawn at 400, and `font-synthesis-weight: none` stops a browser from faking a bold.
- **Self-hosted** from `@fontsource/fragment-mono` (400). The Latin file still preloads with the
  hero, whose backdrop is the largest paint of the home page.
- **No layout shift.** `Fragment Mono Fallback` is Courier New resized to its 0.618 em advance and
  its vertical metrics (@capsizecss/unpack).
- **The painting is measured again.** `scripts/generate-ascii.mjs` holds the ink coverage of each
  glyph in Fragment Mono at 400, measured on a canvas, and the cell aspect of 0.618. The grid is
  now 240 by 95. The 404 field's ramp is reordered by the same coverage.
- **Open Graph cards** use `scripts/assets/fonts/FragmentMono-Regular.ttf` (Google Fonts, OFL
  beside it), so a shared link matches the site.

## Consequences

- `@fontsource-variable/geist-mono` and `geist` are removed; no Geist face is left in the build.
- A future mono must come with its advance, coverage table and fallback metrics; the ASCII art,
  the hero sizing (`AsciiArt.astro`) and `monoWidth` in the cards depend on them.
