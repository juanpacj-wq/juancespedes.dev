# 0026. The capabilities section as a stack of logos by area

- Status: accepted
- Date: 2026-10-15
- Amends: [0023](0023-technology-logo-band.md) (where the logo mapping lives and how a page without
  the band gets the marks)

## Context

The home page listed every technology with the projects that proved it ("Proven in ..."): six cards
of long, linked sentences. The owner found it the plainest section of the site, and redundant,
since each case study already shows its own stack. They asked for the technologies grouped by
area, with logos, like a modern portfolio's stack.

## Decision

- **One row per area.** The area's number and name on the left, in the display face; its
  technologies on the right as a grid of tiles with the logo and the name in mono capitals. No
  links and no project names: the case studies tell where each one was used.
- **Still only what a visible project uses.** The section is fed by the skill-evidence use case,
  so a technology in the catalog that no published project uses stays out.
- **Logos in brand colour where it keeps 3:1** against the theme's canvas, the ink colour
  otherwise; on hover the tile rises and glows in that tone. Technologies without a free,
  faithful logo show a short monogram in the mono face (SQL, XLS, BI), never an invented mark.
- **One sprite, loaded on approach.** Inlining the paths would add about 13 kB (Brotli) to a home
  page with a 31 kB budget. The marks are built into `/tech-logos.svg` at build time; each `<use>`
  keeps its address in `data-href` until the section comes within a screen, like the project
  cards' screenshots, so the logos never compete with the first paint.
- **The mapping moves to `src/ui/icons/tech-logos.ts`**, shared by the case-study band (which
  still inlines its few marks) and the home page.

## Consequences

- Without JavaScript the tiles of logos stay empty; names and monograms are still shown.
- A new technology shows a monogram until it is mapped to an icon in `tech-logos.ts`.
- The stack styles (`.stack-*`) live in the shared stylesheet; they are a few hundred bytes.
