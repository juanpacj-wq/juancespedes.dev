# 0006. Tailwind CSS v4 on top of design tokens

- Status: accepted
- Date: 2026-10-12

## Context

The visual direction (dark-first, Geist Sans and Geist Mono, one amber "signal" accent, rounded
cards) must stay consistent as sections are added, in both dark and light themes.

## Decision

Design tokens (color, type scale, spacing, radii, shadows, motion) are declared once as CSS
custom properties in Tailwind v4's `@theme` block (`src/ui/styles/global.css`). Components use
only token-backed utilities; raw hex values and arbitrary values are rejected in review and, from
phase F2, by a lint rule. Light theme overrides the same tokens.

## Consequences

- One place to change the look; themes are token swaps, not component rewrites.
- Tailwind is a recognizable convention for reviewers, and its output contains only used classes.
