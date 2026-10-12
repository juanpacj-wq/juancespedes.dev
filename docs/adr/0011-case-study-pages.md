# 0011. Case study pages: a fixed template, diagrams as data, a private denylist

- Status: accepted
- Date: 2026-10-12

## Context

Most of the work the site shows runs inside an employer's network: the code is private and the
systems cannot be named in detail. A reviewer still needs to judge the engineering, so each case
must explain the problem, the decisions and the results in a consistent shape. Diagrams are the
clearest way to show a system, but images drift from the text, ignore the theme, are opaque to
screen readers and can leak internal names that no automated check reads.

## Decision

- **A fixed template for `case-study`**, enforced by the schema and the domain: summary, problem,
  responsibilities, constraints, decisions (each with what was ruled out), architecture, outcomes,
  what I would do differently, stack and public links. `outcomes` and `lessons` are mandatory;
  a case without hindsight is a brochure.
- **The architecture diagram is data.** `architecture` holds layers of nodes and flows between
  node ids. `validateArchitecture` (domain) requires at least two layers, kebab-case unique ids
  and flows that point at existing nodes. The page draws it with HTML and tokens: columns on wide
  screens, a vertical stack on phones, and the flows as a readable list. No image, no JavaScript.
  The content tests also require the same drawing (ids and flows) in every language.
- **Pages from frontmatter only.** The MDX body is not rendered; the template has no free-form
  slot, so every page reads the same and every field is validated. New kinds keep their own
  fields and get their own block on the same page component.
- **Internal names stay out of the repository.** The public tests reject IPs, internal hostnames
  and the em dash. Names of servers, vendors, internal products and people cannot be listed in a
  public repo without leaking them, so that list lives in a git-ignored `.content-denylist` file
  locally and in the `CONTENT_DENYLIST` secret in CI. Without either (a fork, a Dependabot run)
  the check is skipped rather than failing.
- **URLs:** Spanish pages at `/proyectos/<slug>`, English at `/en/projects/<slug>` from phase F5.
  Slugs are shared by both languages. Unknown addresses answer a real 404 page with `noindex`.

## Consequences

- Adding a case study is still content only, but writing one takes more effort: the template asks
  for alternatives, a diagram and hindsight. `pnpm new:project` scaffolds a valid skeleton.
- Diagrams are limited to layered flows. A system that needs a different drawing (a sequence, a
  state machine) needs a new block type, decided in a new record.
- The denylist protects only what someone remembered to list; human review of each case remains
  part of publishing.
