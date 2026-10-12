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
