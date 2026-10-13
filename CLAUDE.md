# juancespedes.dev

Personal portfolio of Juan Céspedes. Public repository: it is itself a work sample, so every change
must look like senior work.

## Stack

Astro 7 (static output, React 19 islands), TypeScript strict, Tailwind CSS v4 on design tokens,
MDX content collections, Cloudflare Workers via `@astrojs/cloudflare`. pnpm, Node 24+.

## Commands

- `pnpm dev`: local server. `pnpm build` then `pnpm preview`: production build on workerd.
- `pnpm verify`: format, lint, types, architecture, unit coverage, build (run before finishing).
- `pnpm test:e2e`: Playwright on the production build, with axe. `pnpm lighthouse`: budgets.
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

## Performance budget (read before touching the home page)

CI blocks the merge below 0.95 performance on `/` and `/en` (`lighthouserc.json`), and the home
page sits right at that line: there is no headroom. PR #34 failed it six times in a row and took
81 minutes for a change that worked on the first try, one bottleneck per CI round. To avoid that:

- Lighthouse does not run on the Windows workstation (NO_NAVSTART), so CI is the only meter and
  each round costs about 11 minutes. Never use it to test one hypothesis at a time.
- Before the first push, check the build against the known limits:
  - Styles of a page stay under 4 kB so Astro inlines them; above that they become one more
    render-blocking stylesheet (FCP went from 2.0 s to 2.4 s).
  - Nothing heavy loads with the page: images that only an interaction needs are fetched on that
    interaction, never preloaded or set in CSS from the start (a 23 kB webp pushed LCP to 2.7 s).
  - No animation that repaints many glyphs or elements per frame (TBT reached 1.3 s).
  - Large backgrounds take their size from the viewport (`svh`), not from content that reflows
    when fonts arrive (CLS).
  - Big text drawn in a web font preloads that font with the HTML.
- On the first failure, download every report (`gh run download <run> -n lighthouse-reports`),
  read all failing metrics and audits for both URLs, and fix them all in one push.
- Do not undo and redo the same change across rounds; decide it from the report.
