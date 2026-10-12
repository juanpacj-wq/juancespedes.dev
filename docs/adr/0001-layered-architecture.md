# 0001. Layered architecture in a mostly static site

- Status: accepted
- Date: 2026-10-12

## Context

The site is mostly static content: projects, profile, services. A plain Astro project with data
read inside pages would work. But this repository is also a work sample: reviewers should find
business rules separated from the framework and tested without it. The site will also grow
(more project types, a contact endpoint, an AI chat), and those features need a place where their
rules live independently of Astro, React or Cloudflare.

## Decision

Use four inner layers plus two delivery layers, with dependencies pointing inward only:

| Layer            | Contains                                                                    | May import                      |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------- |
| `domain`         | Entities, value objects, invariants. Pure TypeScript.                       | `domain`                        |
| `application`    | Use cases and ports (interfaces) they need.                                 | `domain`                        |
| `infrastructure` | Adapters implementing ports: content collections, email, AI, rate limiting. | `domain`, `application`         |
| `ui`             | Astro and React components that render view models.                         | `domain`, `ui`                  |
| `composition`    | The composition root wiring use cases to adapters.                          | everything but `ui` and `pages` |
| `pages`          | Thin Astro routes and API endpoints.                                        | `domain`, `ui`, `composition`   |

The rule is enforced twice in CI: `eslint-plugin-boundaries` (at lint time, in the editor) and
`dependency-cruiser` (a separate graph check that also renders `docs/dependency-graph.mmd`).
The domain additionally forbids imports of `astro`, `react`, `node:*`, `zod` and vendor SDKs.

## Where the layering stops

- No dependency-injection framework. `src/composition/container.ts` builds everything by hand.
- No repository per entity "just in case". A port exists only when a use case needs it.
- Content schemas use Zod inside `infrastructure` (Astro content collections) and map to domain
  types there; the domain does not know Zod.
- Purely presentational pages (a privacy notice, a 404) do not get a use case.

## Consequences

- Use cases are tested with in-memory fakes, fast and without a browser or a worker runtime.
- Swapping a provider (email, AI model, hosting) touches one adapter and the composition root.
- More files than a flat Astro project. Accepted: the extra structure is the point of the sample,
  and it is kept to what the features actually use.
