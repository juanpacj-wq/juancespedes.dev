# juancespedes.dev

Personal portfolio of Juan Céspedes. Public repository: it is itself a work sample, so every change
must look like senior work.

## Stack

Astro 7 (static output, React 19 islands), TypeScript strict, Tailwind CSS v4 on design tokens,
MDX content collections, Cloudflare Workers via `@astrojs/cloudflare`. pnpm, Node 24+.

## Commands

- `pnpm dev`: local server. `pnpm build` then `pnpm preview`: production build on workerd.
- `pnpm verify`: format, lint, types, architecture, unit coverage, build, JavaScript and page
  budgets (run before finishing).
- `pnpm test:e2e`: Playwright on the production build, with axe (`--project=chromium` and
  `--grep <path>` for a quick pass on what changed).
- `pnpm lighthouse:local`: Lighthouse as CI runs it, in Docker, after `pnpm build` (about 3 min;
  `RUNS=1 pnpm lighthouse:local en` for one page).
- `pnpm new:project`: scaffold a project as content (guide: `docs/adding-a-project.md`).

## Rules

- Layers and allowed imports: `docs/adr/0001-layered-architecture.md`. Never bypass the boundary
  checks; if a rule blocks you, the design is wrong or an ADR is missing.
- Level: N2 with N3 frontend (`docs/nfr.md`). Apply the personal skills `frontend-produccion`,
  `backend-produccion`, `infra-entrega`, `observabilidad-confiabilidad`, `calidad-pruebas`,
  `privacidad-cumplimiento` and `funcionalidades-base` for the layer being touched.
- Definition of done: `docs/definition-of-done.md`. Design system: `docs/design-system.md`
  (tokens only, enforced by `pnpm lint`; contrast checked by tests).
- Code, docs and commit messages in English; site content in Spanish (es-CO, tuteo) and English.
- Never write the em dash character in any text.
- Commits: Conventional Commits, author `juanpacj-wq` only, no co-author trailers, no AI
  attribution lines.
- Content must not contain internal hostnames, IPs, real operational data or unapproved personal
  data. Testimonials are published only with the author's written approval.

## Performance budget (read before touching a page in `lighthouserc.json`)

CI blocks the merge below 0.95 performance on every page of `lighthouserc.json`. It measures the
build served with Brotli, as Cloudflare serves it (`scripts/preview-compressed.mjs`, ADR 0024).
Before that, the meter paid for uncompressed HTML, the home page sat exactly on 0.95, and PR #34
and PR #39 needed six and four CI rounds (docs/runbooks/deploy-friction.md). To avoid that:

- `pnpm verify` runs `pnpm pages:check`: it fails on a render-blocking stylesheet other than the
  shared one, on an image that downloads with the page, and on HTML over its compressed budget.
  Fix what it reports; do not raise a budget to make it pass without saying why in the PR.
- Before pushing a change to those pages, run `pnpm build && pnpm lighthouse:local`. It judges each
  page by its best run of three, scored with TBT 0: a busy workstation only makes runs worse.
- Known limits:
  - Styles of a page stay under 4 kB so Astro inlines them; above that they become one more
    render-blocking stylesheet. Styles for what is below the first screen load from a script after
    the `load` event (see `ProjectArticle.astro`), with a `<noscript>` link as fallback.
  - An image below the first screen keeps its address in `data-src`/`data-srcset` until a script
    needs it: `loading="lazy"` does not stop the browser's look-ahead (about 2500 px on slow
    connections). First-screen images say `loading="eager"`.
  - Images that only an interaction needs are fetched on that interaction, never preloaded or set
    in CSS from the start.
  - No animation that repaints many glyphs or elements per frame (TBT reached 1.3 s).
  - Large backgrounds take their size from the viewport (`svh`), not from content that reflows
    when fonts arrive (CLS). Text in Overused Grotesk falls back to `Overused Fallback` (Arial with
    its metrics) and mono text to `Fragment Mono Fallback` (Courier New), so nothing moves when the
    fonts arrive.
  - The fonts of the largest paints preload with the HTML: Overused Grotesk (headings, every page)
    and Fragment Mono (the hero's backdrop); other fonts are not preloaded, they compete with the
    render-blocking CSS.
  - Deferring styles changes the states a page goes through: no transition may run when they
    arrive (`data-chapters-ready`), and run the axe tests for the affected pages before pushing.
- If CI still fails, download every report (`gh run download <run> -p 'lighthouse-reports-*'`),
  read all failing metrics and audits, reproduce with `pnpm lighthouse:local` and fix them all in
  one push.
- Do not undo and redo the same change across rounds; decide it from the report.
