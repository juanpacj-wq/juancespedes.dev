# Architecture decision records

Each record states the context, the decision and its consequences. Records are immutable once
accepted; a change of mind is a new record that supersedes the old one.

| #                                                         | Decision                                                                 | Status   |
| --------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| [0001](0001-layered-architecture.md)                      | Layered architecture in a mostly static site                             | Accepted |
| [0002](0002-astro-with-react-islands.md)                  | Astro with React islands                                                 | Accepted |
| [0003](0003-cloudflare-workers-hosting.md)                | Hosting on Cloudflare Workers with static assets                         | Accepted |
| [0004](0004-projects-as-typed-content.md)                 | Projects as typed content, extensible by kind                            | Accepted |
| [0005](0005-i18n-by-route.md)                             | Internationalization by route                                            | Accepted |
| [0006](0006-tailwind-on-design-tokens.md)                 | Tailwind CSS v4 on top of design tokens                                  | Accepted |
| [0007](0007-testing-strategy.md)                          | Testing strategy and quality gates                                       | Accepted |
| [0008](0008-content-validation-layers.md)                 | Content validation in three layers, technology catalog, drafts           | Accepted |
| [0009](0009-theming-and-design-tokens.md)                 | Theming with light-dark() tokens, enforced in CI                         | Accepted |
| [0010](0010-contact-form-delivery.md)                     | Contact form: Email Routing, Turnstile and a rate limit, nothing stored  | Accepted |
| [0011](0011-case-study-pages.md)                          | Case study pages: fixed template, diagrams as data, private denylist     | Accepted |
| [0012](0012-bilingual-routes-and-seo.md)                  | Bilingual routes and SEO: Spanish at the root, English under /en         | Accepted |
| [0013](0013-launch-hardening-and-operations.md)           | Launch: security headers, monitoring without third parties, releases     | Accepted |
| [0014](0014-mutation-testing.md)                          | Mutation testing of the domain with Stryker                              | Accepted |
| [0015](0015-notes-and-now-page.md)                        | Technical notes and a "now" page, as validated content                   | Accepted |
| [0016](0016-command-palette.md)                           | Command palette without a UI framework                                   | Accepted |
| [0017](0017-ask-me-chat.md)                               | "Ask me": a chat about the published work, with bounded cost             | Accepted |
| [0018](0018-chiaroscuro-redesign.md)                      | Chiaroscuro: a visual identity with an ASCII painting and visible prices | Accepted |
| [0019](0019-reference-hero-chat-and-case-cards.md)        | Rotating role in the hero, floating chat, case-study cards               | Accepted |
| [0020](0020-not-found-reflection.md)                      | The 404 as a reflection: an ASCII "404" solid mirrored under a waterline | Accepted |
| [0021](0021-case-study-redesign.md)                       | Case studies as a told story: plain-language problem, live diagram       | Accepted |
| [0022](0022-real-screenshots-and-gallery.md)              | Real screenshots in case studies, shown in a framed gallery              | Accepted |
| [0023](0023-technology-logo-band.md)                      | Technologies as one draggable band of logos                              | Accepted |
| [0024](0024-faster-deploys.md)                            | Faster deploys: compressed Lighthouse, local budgets, parallel CI        | Accepted |
| [0025](0025-business-impact-section.md)                   | Business impact instead of a CV-style history                            | Accepted |
| [0026](0026-stack-by-area.md)                             | The capabilities section as a stack of logos by area                     | Accepted |
| [0027](0027-sharp-screenshots-and-responsive-captures.md) | Sharp screenshots, and phone and tablet captures beside them             | Accepted |
| [0028](0028-pinned-project-stage.md)                      | Featured projects on a pinned stage                                      | Accepted |
| [0029](0029-wide-clean-layout.md)                         | A wide, quieter layout with one grotesk                                  | Accepted |
| [0030](0030-overused-grotesk.md)                          | Overused Grotesk, chosen from what 2026 sites use                        | Accepted |

Template: copy any record, keep the headings (Context, Decision, Consequences), number it next.
