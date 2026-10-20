# 0034. The site as the first instance of a reusable engine

- Status: accepted
- Date: 2026-10-20

## Context

The code behind this site (the layers of ADR 0001, the quality gates, the chat, the palette, the
case-study template and the ASCII hero) is meant to be read, and other developers could use it for
their own portfolios. Today they cannot: the owner's identity is written into code (the site
constants, the interface dictionary, the chat instructions, the privacy pages, the Worker
configuration), the languages are fixed to Spanish and English, the tests assert this site's
content, and the license reserved every file under `content/`, `src/assets/` and `public/`.

Theme catalogs such as Astro's reject a theme that ships real personal content or uses a personal
site as its demo, so publishing this repository as it is would not work either.

## Decision

- **Engine and instance.** Everything that is not this site's content becomes engine code that
  reads the content and one site configuration file. The site stays the first instance of that
  engine; a public template, **Narcissus**, is extracted from it with sample content and its own
  demo.
- **Refactors leave the site alone.** Each step lands as a normal pull request that changes no
  page a visitor gets. `pnpm dist:compare <before> <after>` (scripts/compare-dist.mjs) compares
  two client builds, with script and style chunk hashes normalized, and is the local evidence
  before Lighthouse runs in CI.
- **The template starts with a fresh history.** It is produced by a script from the engine paths
  plus sample content, and the script fails on any of the owner's identifiers or any denylist
  term. Later engine changes reach this site by applying the diff between two template tags to the
  engine paths, which works with squash merges and unrelated histories.
- **The denylist covers every tracked file.** It moved from the content tests to
  `tests/content/denylist.test.ts`, which scans `git ls-files` and reports the file, the line and
  the entry number, never the term, since CI logs of a public repository are public too.
- **Licenses are split.** `LICENSE` is the plain MIT text, so GitHub detects it; the reservation
  on this site's content moved to `CONTENT-LICENSE.md`, which also lists the files that keep their
  own terms (OFL fonts, the public-domain painting, technology logos).

## Consequences

- Every engine change is checked twice from now on: against this site's content and against the
  template's sample content, two datasets for one engine.
- Some of the owner's text moves out of `src/ui/i18n/dictionary.ts` into content and configuration,
  and the chat instructions are split into engine rules and the owner's policies. The prompt sent
  to the model must stay byte-identical through that move, or the prompt cache misses.
- The records 0001 to 0033 were written for this site and stay as they are; the template keeps
  them as design rationale, because the code cites them by number.
