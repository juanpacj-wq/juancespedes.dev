# 0008. Content validation in three layers, a technology catalog and drafts

- Status: accepted
- Date: 2026-10-12

## Context

ADR 0004 made projects typed content. Three gaps remained: rules that a schema cannot express
(a period that ends before it starts, a featured project without a measurable result), rules that
span files (the Spanish and English versions must agree), and inconsistent technology names that
would split the skill-evidence matrix ("SQL Server" and "MSSQL" counted as two skills).

## Decision

1. **Shape** is checked by Zod in `src/infrastructure/content/schemas.ts`. Objects are strict, so
   a misspelled key fails instead of being ignored.
2. **Business rules** live in the domain (`validateProjectContent`) and run inside the schema
   through `superRefine`. The same function backs `createProject`, so the rules hold whether a
   project comes from a file, a test or a future CMS. The domain never imports Zod.
3. **Cross-file rules and policy** run as Vitest content tests over the real files: translation
   parity, identical language-independent fields, catalog references, no `TODO` on published
   projects, and the anonymization patterns.

Technology names come from `content/technologies.yaml`, which also assigns each technology to the
capability it proves. Projects have `status: draft | published`; drafts are visible only in
`astro dev` (decided in the composition root) and are reported as "not found" otherwise.

`src/content.config.ts` sits at the root of `src/` because Astro requires it there. It is
configuration, not a layer: it only imports schemas from `infrastructure`.

## Consequences

- A malformed project stops `astro sync` and the build with every issue listed, Zod and domain
  alike.
- The skill matrix can only list technologies that a visible project proves.
- Authors can commit unfinished work as drafts without it ever reaching production.
