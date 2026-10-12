# Design system

Live reference: [`/design-system`](https://juancespedes.dev/design-system) (not indexed).
Decisions: [ADR 0006](adr/0006-tailwind-on-design-tokens.md) and
[ADR 0009](adr/0009-theming-and-design-tokens.md).

## Direction

Dark first, with a complete light theme. Geist Sans for text and names; Geist Mono for roles,
labels and technical data. One amber "signal" accent. Rounded cards with 1 px borders. Motion is
quiet (hover lift, color transitions) and switches off with `prefers-reduced-motion`.

## Tokens

All values live in `src/ui/styles/global.css`.

| Group   | Tokens (Tailwind utilities)                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------- |
| Surface | `canvas`, `surface`, `surface-raised`, `line`, `line-strong`                                         |
| Text    | `ink` (primary), `muted` (secondary), `subtle` (tertiary, still AA)                                  |
| Accent  | `accent` (fills), `accent-ink` (accent text and links), `on-accent` (text on accent fills)           |
| Status  | `success`                                                                                            |
| Type    | `text-display`, `text-heading`, `text-title`, `text-lead`, `text-body`, `text-small`, `text-eyebrow` |
| Radius  | `rounded-chip`, `rounded-control`, `rounded-card`, `rounded-panel`                                   |
| Shadow  | `shadow-card`, `shadow-lift`                                                                         |

Display and heading sizes are fluid (`clamp()`), so headings scale between phone and desktop
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
| `Card`      | Bordered surface; `interactive` lifts on hover and focus                         |
| `Stat`      | Headline figure that always prints its source                                    |
| `Portrait`  | 4:5 photo with AVIF/WebP, or a monogram placeholder until the photo exists       |

Site chrome (`src/ui/chrome`): `SiteHeader`, `SiteFooter`, `ThemeToggle`. Page layout:
`src/ui/layouts/BaseLayout.astro` (meta, theme bootstrap, skip link, header, footer).

## Rules

- Never write a raw color or an arbitrary design value; `pnpm lint` fails if you do.
- Interface text goes through `src/ui/i18n/dictionary.ts`; English is type-checked against
  Spanish.
- Components receive data as props. They never import use cases or adapters.
