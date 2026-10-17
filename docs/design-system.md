# Design system

Live reference: [`/design-system`](https://juancespedes.dev/design-system) (not indexed).
Decisions: [ADR 0006](adr/0006-tailwind-on-design-tokens.md) and
[ADR 0009](adr/0009-theming-and-design-tokens.md).

## Direction

Chiaroscuro ([ADR 0018](adr/0018-chiaroscuro-redesign.md)): a warm near-black ground, cream ink
and one candle-ochre light, with a complete light theme. Since [ADR 0029](adr/0029-wide-clean-layout.md)
one grotesk, Overused Grotesk ([ADR 0030](adr/0030-overused-grotesk.md)), sets headings (medium, tight tracking) and text; Fragment Mono ([ADR 0031](adr/0031-fragment-mono.md)) sets data,
labels and the ASCII painting. The page frame is 120rem wide with 16 to 64 px gutters, so wide
screens are used edge to edge. Section headers are one line: a hairline, a short title and, only
when needed, a brief note on the right. Each fact appears once per page; the project page holds the
detail. Surfaces are bevelled rather than bordered; the `Frame` primitive nests a stage inside a
frame with concentric corners. Buttons are pills. Motion is quiet and switches off with
`prefers-reduced-motion`.

## Tokens

All values live in `src/ui/styles/global.css`.

| Group   | Tokens (Tailwind utilities)                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surface | `canvas`, `surface`, `surface-raised`, `frame`, `line`, `line-strong`                                                                            |
| Text    | `ink` (primary), `muted` (secondary), `subtle` (tertiary, still AA)                                                                              |
| Accent  | `accent` (fills), `accent-ink` (accent text and links), `on-accent` (text on accent fills)                                                       |
| Status  | `success` (verdigris)                                                                                                                            |
| Art     | `ascii` (the ink of the hero painting)                                                                                                           |
| Type    | `font-display`; `text-display`, `text-heading`, `text-quote`, `text-title`, `text-price`, `text-lead`, `text-body`, `text-small`, `text-eyebrow` |
| Radius  | `rounded-chip`, `rounded-control`, `rounded-card`, `rounded-panel`, `rounded-frame`, `rounded-stage`                                             |
| Shadow  | `shadow-card`, `shadow-lift`, `shadow-bevel`, `shadow-glow`                                                                                      |

Display, heading and quote sizes are fluid (`clamp()`), so headings scale between phone and desktop
without breakpoints.

## Primitives (`src/ui/primitives`)

| Component   | Use                                                                                |
| ----------- | ---------------------------------------------------------------------------------- |
| `Container` | Page width (120rem) and gutters (16 px on phones, 64 px on wide screens)           |
| `Section`   | One-line header (hairline, title, optional note), heading level, `aria-labelledby` |
| `Button`    | Link or button, three variants, 44 px minimum target, external-link announcement   |
| `TextLink`  | Inline underlined link, external arrow and screen-reader note                      |
| `Badge`     | Mono label; `status` adds a decorative live dot                                    |
| `Tag`       | Technology chip, always text                                                       |
| `Card`      | Bevelled surface; `interactive` brightens and scales slightly on hover             |
| `Frame`     | Frame with a label row around a stage; `inverted` swaps ink and canvas             |
| `Stat`      | Headline figure that always prints its source                                      |
| `Portrait`  | 4:5 photo with AVIF/WebP; until it exists, its `fallback` slot or a monogram       |

Art (`src/ui/art`): `AsciiArt` renders the committed ASCII grid of Caravaggio's _Narcissus_
(`pnpm ascii` regenerates it) with a lamp that follows the pointer and a switch that floods the
painting's real colours. `NotFoundField` is the 404 backdrop: the display font's "404" as a
turning solid of points, drawn in the same ink and glyph ramp on a canvas, mirrored under a
waterline ([ADR 0020](adr/0020-not-found-reflection.md)).

Case studies (`src/ui/project`, styles in `src/ui/styles/case-study.css`): `DetailSection` is a
numbered chapter whose title stays pinned on wide screens; `ArchitectureDiagram` draws layers,
nodes and flows as text, and `case-study-motion.ts` adds the wires, highlights and step-through
walk on top. Motion on these pages is scroll-driven CSS plus that one deferred script, and no
starting state lowers text contrast ([ADR 0021](adr/0021-case-study-redesign.md)).

Home page projects: `ProjectStage` pins the featured case studies on wide screens and brings one
in over the other as the visitor scrolls, from a single `--p` property; phones and reduced motion
keep a list ([ADR 0028](adr/0028-pinned-project-stage.md)).

Impact (`src/ui/impact`): `AchievementCard` is a figure, one sentence and the project it came from,
under a hairline; the whole item opens the case study, where the story, chart and source live
([ADR 0025](adr/0025-business-impact-section.md), trimmed by [ADR 0029](adr/0029-wide-clean-layout.md)).

Site chrome (`src/ui/chrome`): `SiteHeader`, `SiteFooter`, `ThemeToggle`, and `ContactRail`, the
LinkedIn, GitHub and email buttons fixed to the right edge from 80rem, in the 4rem gutter. The
header moves (`site-header.ts`, styles in `chrome.css`): a pill glides under the pointer between
menu items, each label's letters roll up (`RollingLabel`), a line drawn in `--ease-in-out` marks
the home section being read (`aria-current="location"`), the logo's name scrambles through code
glyphs, and a new theme spreads as a circle from its switch. Reduced motion keeps only the states.
Page layout:
`src/ui/layouts/BaseLayout.astro` (meta, theme bootstrap, skip link, header, footer).

## Rules

- Never write a raw color or an arbitrary design value; `pnpm lint` fails if you do.
- Interface text goes through `src/ui/i18n/dictionary.ts`; English is type-checked against
  Spanish.
- Components receive data as props. They never import use cases or adapters.
