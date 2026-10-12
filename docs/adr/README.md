# Architecture decision records

Each record states the context, the decision and its consequences. Records are immutable once
accepted; a change of mind is a new record that supersedes the old one.

| #                                               | Decision                                                                | Status   |
| ----------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| [0001](0001-layered-architecture.md)            | Layered architecture in a mostly static site                            | Accepted |
| [0002](0002-astro-with-react-islands.md)        | Astro with React islands                                                | Accepted |
| [0003](0003-cloudflare-workers-hosting.md)      | Hosting on Cloudflare Workers with static assets                        | Accepted |
| [0004](0004-projects-as-typed-content.md)       | Projects as typed content, extensible by kind                           | Accepted |
| [0005](0005-i18n-by-route.md)                   | Internationalization by route                                           | Accepted |
| [0006](0006-tailwind-on-design-tokens.md)       | Tailwind CSS v4 on top of design tokens                                 | Accepted |
| [0007](0007-testing-strategy.md)                | Testing strategy and quality gates                                      | Accepted |
| [0008](0008-content-validation-layers.md)       | Content validation in three layers, technology catalog, drafts          | Accepted |
| [0009](0009-theming-and-design-tokens.md)       | Theming with light-dark() tokens, enforced in CI                        | Accepted |
| [0010](0010-contact-form-delivery.md)           | Contact form: Email Routing, Turnstile and a rate limit, nothing stored | Accepted |
| [0011](0011-case-study-pages.md)                | Case study pages: fixed template, diagrams as data, private denylist    | Accepted |
| [0012](0012-bilingual-routes-and-seo.md)        | Bilingual routes and SEO: Spanish at the root, English under /en        | Accepted |
| [0013](0013-launch-hardening-and-operations.md) | Launch: security headers, monitoring without third parties, releases    | Accepted |

Template: copy any record, keep the headings (Context, Decision, Consequences), number it next.
