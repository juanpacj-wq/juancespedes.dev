# Design system

Live reference: [`/design-system`](https://juancespedes.dev/design-system) (not indexed).
Decisions: [ADR 0006](adr/0006-tailwind-on-design-tokens.md) and
[ADR 0009](adr/0009-theming-and-design-tokens.md).

## Direction

Chiaroscuro ([ADR 0018](adr/0018-chiaroscuro-redesign.md)): a warm near-black ground, cream ink
and one candle-ochre light, with a complete light theme. Literata (light, display optical size)
for headlines and section titles, Geist Sans for text, Geist Mono for data, captions and the
ASCII painting. Surfaces are bevelled rather than bordered; the `Frame` primitive nests a stage
inside a frame with concentric corners. Buttons are pills. Motion is quiet and switches off with
`prefers-reduced-motion`: pills scale slightly, sections rise and clear a small blur on scroll
where the browser supports view timelines.

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

| Component   | Use                                                                              |
| ----------- | -------------------------------------------------------------------------------- |
| `Container` | Page width and gutters (16 px on phones)                                         |
| `Section`   | Titled section with eyebrow, configurable heading level and `aria-labelledby`    |
| `Button`    | Link or button, three variants, 44 px minimum target, external-link announcement |
| `TextLink`  | Inline underlined link, external arrow and screen-reader note                    |
| `Badge`     | Mono label; `status` adds a decorative live dot                                  |
| `Tag`       | Technology chip, always text                                                     |
| `Card`      | Bevelled surface; `interactive` brightens and scales slightly on hover           |
| `Frame`     | Frame with a label row around a stage; `inverted` swaps ink and canvas           |
| `Stat`      | Headline figure that always prints its source                                    |
| `Portrait`  | 4:5 photo with AVIF/WebP, or a serif monogram placeholder until the photo exists |

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

Impact (`src/ui/impact`): `AchievementCard` is a bevelled card with a kind and place rule, a
figure in the tone of the win (verdigris for security and reliability, ochre for speed and savings)
and its source; `AchievementChart` draws a before and after, a breakdown or progress as bars that
grow on scroll ([ADR 0025](adr/0025-business-impact-section.md)).

Site chrome (`src/ui/chrome`): `SiteHeader`, `SiteFooter`, `ThemeToggle`. Page layout:
`src/ui/layouts/BaseLayout.astro` (meta, theme bootstrap, skip link, header, footer).

## Rules

- Never write a raw color or an arbitrary design value; `pnpm lint` fails if you do.
- Interface text goes through `src/ui/i18n/dictionary.ts`; English is type-checked against
  Spanish.
- Components receive data as props. They never import use cases or adapters.
