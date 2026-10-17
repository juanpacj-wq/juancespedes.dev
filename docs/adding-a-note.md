# Adding a note or updating the now page

Both are content, not code ([ADR 0015](adr/0015-notes-and-now-page.md)).

## A technical note

1. Create `content/notes/<slug>/es.mdx` and `en.mdx` (`slug` in kebab-case, shared by both).
2. Frontmatter, the same dates, status and number of topics in both files:

```yaml
---
title: A strict CSP in Astro on Cloudflare Workers
summary: One or two sentences, at most 240 characters; also the page description.
published: '2026-10-12'
updated: null # or a date not earlier than published
tags: [security, astro] # 1 to 5, unique
status: draft # publish with: published
---
```

3. Write the article below the frontmatter in MDX. `##` headings become the outline at the top of
   the page. Code blocks are highlighted with the site's dark theme.
4. Drafts show up in `pnpm dev` only. `pnpm test` checks both languages; the build adds the pages,
   the Open Graph cards and the sitemap entries.

The anonymization rules apply as for projects: no internal names, hosts or data.

## The now page

Edit `content/now/es.yaml` and `en.yaml`: change `updated` to today and the sections. Both files
must keep the same date and the same number of sections and items.
