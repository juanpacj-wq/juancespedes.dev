# 0004. Projects as typed content, extensible by kind

- Status: accepted
- Date: 2026-10-12

## Context

The portfolio will keep growing: long case studies, many Power BI reports to be added once demo
data exists, open-source projects and small tools. Adding a project must not require code
changes, and a malformed entry must never reach production.

## Decision

Projects live in an Astro content collection, one folder per project:
`content/projects/<slug>/{es,en}.mdx` plus its images. The frontmatter schema is a Zod
discriminated union on `kind`:

- `case-study`: problem, role, constraints, decisions, architecture, results, lessons.
- `report`: business questions answered, data sources, highlighted measures, screenshot gallery.
- `open-source`: repository, install command, status.
- `tool`: platform, what it automates, distribution.

All kinds share a common core (title, summary, period, capabilities, stack, metrics with a source,
`featured`, `order`). The infrastructure adapter maps entries to domain `Project` values; the home
table, capability filter, skill-evidence matrix, sitemap and chat corpus all read the full
collection. `pnpm new:project` scaffolds a valid folder for any kind.

## Consequences

- Adding a project is adding a folder; a new kind is one union member and one view template.
- The build fails on invalid frontmatter, a missing translation or a metric without a source.
- MDX gives rich case studies (diagrams, callouts) without a CMS. A CMS can be added later
  behind the same repository port if non-technical editing is ever needed.
