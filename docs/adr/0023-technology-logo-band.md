# 0023. Technologies as one draggable band of logos

- Status: accepted
- Date: 2026-10-14
- Amends: [0021](0021-case-study-redesign.md) (the stack showed twice: tags and a band of words)

## Context

Each case study listed its stack twice: a row of tags under the "Technologies" title and, below it,
a band of outlined words. The owner found it redundant and plain, and asked for a single band that
can be grabbed and dragged, showing each technology's logo instead of its name.

## Decision

- **One band, in the "Technologies" chapter.** Its window is as wide as one round of the stack,
  up to the width of the screen, so a short stack makes a short, centred band and each logo shows
  once until the loop brings it back. It drifts slowly, and can be
  grabbed and dragged either way with a mouse or a finger; a throw keeps its momentum and decays
  back to the drift. The track holds two equal halves, so the loop has no seam. Reduced motion
  stops the drift; dragging still works. Without JavaScript it is a scrollable row.
- **Logos from Simple Icons (CC0), inlined at build time.** No request and no client code for the
  marks. The brand colour is used where it keeps 3:1 against the theme's canvas (a graphic's
  minimum contrast); otherwise the logo takes the ink colour. Each logo is an image named after the
  technology, and its name appears under it on hover.
- **No invented marks.** A technology without a free, faithful logo (Microsoft products, systemd,
  Oracle, protocols and practices) shows its name as a wordmark in the display face, sized to weigh
  about what a logo weighs. The mapping lives in `src/ui/icons/tech-logos.ts` (moved there by
  [0026](0026-stack-by-area.md)).

## Consequences

- `simple-icons` is a development dependency; only the paths of the icons in use reach the HTML.
- A new technology shows as a wordmark until it is mapped to an icon in `tech-logos.ts`.
- The facts grid at the top still lists the main technologies as text.
