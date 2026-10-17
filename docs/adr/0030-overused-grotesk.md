# 0030. Overused Grotesk, chosen from what 2026 sites use

- Status: accepted
- Date: 2026-10-15
- Amends: [0029](0029-wide-clean-layout.md) (the text face)

## Context

ADR 0029 moved the site to one grotesk, Hanken Grotesk. The owner approved the layout but asked
for a face that is not among an assistant's usual first picks, chosen from a contemporary
directory of fonts that real websites use.

The source is the MaxiBestOf collection of curated websites, which counts the fonts each published
site uses. In 2026 the most used faces are Inter, Suisse Int'l, ABC Diatype, PP Neue Montreal and
Geist Mono; the neo-grotesks that lead are paid. Its open-source list, by number of sites, is Inter
(649), Geist Mono, JetBrains Mono, Switzer (32), Geist Sans, Archivo, Public Sans, Aspekta (12),
Martian Mono, Uncut Sans and Overused Grotesk. Inter, Geist and the faces assistants reach for by
default (Space Grotesk, DM Sans, Manrope, Instrument, Bricolage, Hanken) were left out.

## Decision

- **Overused Grotesk** (RandomMaerks, OFL 1.1) sets headings and text. It is the open-source face
  closest to PP Neue Montreal, fourth in the 2026 ranking, and it is used by curated sites in the
  collection. Aspekta was the other finalist; both were rendered in the site's palette, and
  Overused Grotesk read closer to the neo-grotesk the references use.
- **Self-hosted, cut down.** The variable font is instanced to upright only (weights 300 to 900)
  and subset to Latin and the punctuation the copy uses: 34 kB, the same as the face it replaces.
  `src/assets/fonts/overused-grotesk-latin.woff2` with its license beside it. It preloads with the
  HTML.
- **No layout shift.** `Overused Fallback` is Arial resized to its metrics (@capsizecss/unpack).
- **Tracking** relaxes a little for this face: -0.035em on headings and -0.04em on the display.
- **Open Graph cards** use its static Roman and SemiBold cuts, subset the same way
  (`scripts/assets/fonts`), so a shared link looks like the site.
- The hero's role ticker gets a taller window than the title's line: this face's descenders reach
  further, and a one-line window cut the "g" of "engineer" and showed the role above it.

## Consequences

- `@fontsource-variable/hanken-grotesk` is removed; Geist Mono still came from Fontsource
  until [ADR 0031](0031-fragment-mono.md) replaced it with Fragment Mono.
- Updating the face means re-running the instancer and subsetter (commands in the PR that added
  it) on a new release from the RandomMaerks repository.
