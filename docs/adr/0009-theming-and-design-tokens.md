# 0009. Theming with light-dark() tokens, enforced in CI

- Status: accepted
- Date: 2026-10-12

## Context

ADR 0006 put design tokens behind Tailwind. Three questions were left open: how the two themes
are expressed without duplicating every value, how a visitor's choice applies without a flash of
the wrong theme, and how "no raw colors" is enforced rather than hoped for.

## Decision

- **One declaration per token.** Each color token is written once with CSS `light-dark()`:
  `--canvas: light-dark(#fafaf9, #0b0b0d)`. The `color-scheme` property picks the pair. Dark is
  the brand default; `data-theme="light"` or `"dark"` on `<html>` overrides it.
- **No flash.** A four-line inline script in `<head>` reads the stored choice and sets
  `data-theme` before first paint. The toggle is a plain DOM script, not a React island: one
  button does not justify shipping a UI framework runtime on every page. React stays reserved
  for islands with real state (filters, command palette, chat).
- **Only tokens exist.** Tailwind's default palette is removed (`--color-*: initial`), so a
  class like `bg-red-500` does not compile to anything.
- **Checked in CI.** `scripts/check-tokens.mjs` (part of `pnpm lint`) rejects hex, rgb, hsl and
  oklch values and arbitrary values on design utilities (`p-[13px]`, `text-[1.1rem]`) anywhere in
  `src/ui` or `src/pages`. A line may opt out only with a `tokens-allow` comment explaining why.
- **Contrast is a test.** `tests/unit/ui/contrast.test.ts` reads the tokens from the stylesheet and
  asserts WCAG 2.2 AA for every text/background pair in both themes.
- **Fonts are self-hosted** (Geist and Geist Mono, OFL) with `font-display: swap` and per-script
  subsets, so there is no third-party request and no blocking render.

## Consequences

- Changing a color is one edit, and the contrast test says immediately whether it still passes.
- `light-dark()` needs browsers from 2024 onwards; older ones fall back to the dark values.
- The design reference page `/design-system` renders every token and primitive live and is
  covered by axe in both themes.
