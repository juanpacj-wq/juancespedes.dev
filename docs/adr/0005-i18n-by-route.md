# 0005. Internationalization by route

- Status: accepted; URL scheme refined by [0012](0012-bilingual-routes-and-seo.md)
- Date: 2026-10-12

## Context

The audience is split between Spanish-speaking clients and English-speaking employers. Search
engines must index both languages, and links shared on LinkedIn must open in the right one.

## Decision

Spanish is the default locale. Every page exists under `/es/...` and `/en/...` with `hreflang`
alternates and a visible language switch. UI strings live in typed dictionaries; project content
is written per locale (`es.mdx`, `en.mdx`), never machine-translated at runtime. A content test
fails the build if a project or dictionary key exists in only one language.

## Consequences

- Clean, indexable URLs and correct previews when shared.
- Every content change is done twice; the parity test makes forgetting impossible.
