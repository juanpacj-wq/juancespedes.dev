# 0015. Technical notes and a "now" page, as validated content

- Status: accepted
- Date: 2026-10-12

## Context

Case studies explain systems; they do not have room for the detail of one problem solved well,
which is often what convinces a technical reader. Separately, a "now" page (nownownow.com) answers
the question a recruiter or client asks first: what is this person doing at the moment. Both had
to fit the site's rules: bilingual with parity, validated before publishing, part of the sitemap,
the structured data and the Open Graph cards, and editable without touching code.

## Decision

- **Notes are a content collection**, `content/notes/<slug>/{es,en}.mdx`: frontmatter with title,
  summary, publication and update dates, 1 to 5 unique topics and a draft status; the MDX body is
  the article. The domain (`src/domain/writing/note.ts`) checks real calendar dates (no
  2026-02-30), that an update is not earlier than publication and the topic rules. Drafts are
  visible in `astro dev` only, like projects.
- **The body is rendered outside the domain.** `renderNoteBody` in the infrastructure returns the
  Astro component and the headings; the composition root hands it to the page. The domain model
  stays a plain value.
- **The "now" page is one YAML file per language** with a required update date, shown next to the
  title: the page is only true as of that date. A relative "N days ago" was dropped because a
  static page would freeze it at build time.
- **Same plumbing as the rest of the site.** New routes in the route table (`/notas`,
  `/notas/<slug>`, `/ahora` and `/en/notes`, `/en/notes/<slug>`, `/en/now`) give canonical URLs,
  hreflang, the sitemap and the language switch for free. Notes carry `BlogPosting` JSON-LD tied
  to the site's `Person`, and each page gets its own Open Graph card.
- **Code follows the site theme.** Shiki emits both themes as CSS variables and `light-dark()`
  picks one. The light theme is `github-light-high-contrast`: axe found that `github-light`'s
  orange and red fall below AA on the site's surface (3.1 and 4.1).
- **Parity is tested.** Content tests require every note in both languages with the same dates,
  status and number of topics, and the now page with the same date and shape in both languages.

## Consequences

- Writing a note is adding a folder with two MDX files; nothing in `src/` changes.
- The now page goes stale if nobody updates it; showing the date makes that visible instead of
  hiding it. Updating it is a one-line change to `updated` plus the text.
