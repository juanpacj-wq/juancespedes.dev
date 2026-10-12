# 0012. Bilingual routes and SEO: Spanish at the root, English under /en

- Status: accepted (refines the URL scheme of 0005)
- Date: 2026-10-12

## Context

ADR 0005 chose internationalization by route with `/es/...` and `/en/...`. By the time English
arrived, Spanish pages were already live at the root (`/`, `/proyectos/<slug>`, `/privacidad`)
and their links were in a CV and on LinkedIn. Moving them would break those links or add a
redirect to every visit. Search engines and LinkedIn previews also need per-page metadata,
structured data and an image for each language.

## Decision

- **Spanish stays at the root; English lives under `/en`** with translated segments:
  `/en`, `/en/projects/<slug>`, `/en/privacy`. Slugs are shared, so switching language keeps the
  reader on the same project.
- **One route table** (`src/ui/i18n/routes.ts`) maps a page (`home`, `privacy`, `project`) to its
  path in each language. The canonical URL, the `hreflang` alternates (plus `x-default` pointing
  at Spanish), the visible language switch, the sitemap and the Open Graph image path all derive
  from it, so they cannot disagree.
- **Views are shared, routes are thin.** `src/pages/_views/*` render a page for a given locale;
  each route file only picks the locale. A page cannot exist in one language only without a
  route file, and the e2e suite walks the sitemap and fails on any page without a reciprocal
  translation.
- **Structured data**: a `Person` and a `WebSite` on the home page; a `CreativeWork` and a
  `BreadcrumbList` on each project page, all tied to the same `Person` by `@id`. Builders are pure
  functions with unit tests; the layout serializes them with `<` escaped.
- **Open Graph cards** are generated before each build by `scripts/generate-og.mjs`: SVG drawn
  from the dictionary and the project frontmatter, rendered to 1200 x 630 PNG with resvg and the
  Geist TTF fonts. They are build output (git-ignored), not hand-made assets. Satori was ruled
  out: every release of it appeared re-published on the same day, which we treat as a supply
  chain risk.
- **The 404 page** is one static file for every unknown address, so it speaks both languages.

## Consequences

- Old Spanish links keep working with no redirect.
- The URL scheme is asymmetric (`/proyectos` versus `/en/projects`); the route table hides it from
  components.
- Card layout uses estimated glyph widths, since SVG has no text measurement; a very long title is
  shrunk and, as a last resort, ends with an ellipsis.
