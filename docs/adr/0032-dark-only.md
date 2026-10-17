# 0032. One theme: dark

- Status: accepted
- Date: 2026-10-17
- Supersedes: [0009](0009-theming-and-design-tokens.md) (the light theme and its switch; the
  token rules stay)

## Context

The site had a light theme beside the dark brand default (ADR 0009, ADR 0018). The identity is a
chiaroscuro: Caravaggio's _Narcissus_ as ASCII on a near-black ground, lit by one ochre light. On a
white ground the same painting never read well. Darker ink (PR #48), more opacity and a version
coloured by the painting's negative were tried; none kept the effect, and every page carried a
switch, an inline script and a second set of values to test for a theme that weakened the work.

## Decision

- **Dark is the only theme.** Every color token in `global.css` holds one value; `light-dark()`,
  the `data-theme` overrides and `<meta name="color-scheme">` other than `dark` are gone.
- **No switch.** The header button, its view-transition spread, the palette action and their
  labels are removed, and so is the inline script that applied a stored choice before first paint.
  A `theme` value left in a visitor's storage is ignored.
- **Third-party widgets are told the theme.** Turnstile renders with `theme: 'dark'` instead of
  following the visitor's system setting.
- **Code in notes** uses one Shiki theme, `github-dark`, still as CSS variables over
  `--surface-raised`.
- **Brand logos** keep their colour where it holds 3:1 against the dark canvas; the light-canvas
  check (`onLight`) is removed.
- **Kept from ADR 0009:** tokens only, raw colors rejected by `scripts/check-tokens.mjs`, contrast
  as a test (`tests/unit/ui/contrast.test.ts`, now over one set of values), self-hosted fonts.

## Consequences

- One inline script hash less in the CSP and a little less HTML and JavaScript on every page.
- Axe runs once per page instead of once per theme; an e2e test checks that the page stays dark
  for a visitor who had chosen the light theme.
- A visitor whose system asks for light gets the dark site. Bringing a light theme back means
  designing it for the painting first, then restoring the switch and the second set of values.
