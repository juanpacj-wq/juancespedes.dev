# 0002. Astro with React islands

- Status: accepted
- Date: 2026-10-12

## Context

A portfolio is read far more than it is interacted with. Load speed and SEO matter most; a few
pieces need client-side behaviour (project filter, command palette, theme toggle, chat).

## Decision

Astro renders every page to static HTML at build time. Interactive pieces are React components
hydrated as islands (`client:visible` or `client:idle`), and only those ship JavaScript.
The two dynamic endpoints (`/api/health`, later `/api/contact` and `/api/chat`) opt out of
prerendering and run on Cloudflare Workers.

React is chosen over lighter options (Preact, Solid) because it is the owner's production stack
and what most employers screen for; the cost is bounded by a JavaScript budget enforced in CI.

## Consequences

- Near-zero JavaScript on content pages; Lighthouse performance is a CI gate.
- Two component syntaxes (`.astro` and `.tsx`). Rule of thumb: `.astro` unless it needs state.
