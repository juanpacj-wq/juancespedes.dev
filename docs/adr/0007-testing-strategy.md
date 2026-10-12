# 0007. Testing strategy and quality gates

- Status: accepted
- Date: 2026-10-12

## Context

The repository is evaluated by people deciding whether to hire its author. Quality has to be
demonstrated by automated, visible checks, not claimed.

## Decision

| Level         | Tool                                                         | Scope                                                      | Gate                                                        |
| ------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Static        | Prettier, ESLint (strict type-checked), `astro check`, `tsc` | Everything                                                 | Zero errors and warnings                                    |
| Architecture  | eslint-plugin-boundaries, dependency-cruiser                 | `src/`                                                     | Zero layer violations                                       |
| Unit          | Vitest                                                       | `domain`, `application`                                    | ≥ 90 % lines, branches, functions                           |
| Content       | Vitest                                                       | Content collections                                        | Translation parity, sourced metrics, anonymization patterns |
| Integration   | Vitest on the workers runtime                                | `/api/*` endpoints                                         | Happy path, validation, rate limits, RFC 9457 errors        |
| End-to-end    | Playwright (Chromium, WebKit, mobile)                        | Critical flows on the production build served by `workerd` | All green                                                   |
| Accessibility | axe-core inside Playwright                                   | Every page                                                 | Zero WCAG 2.2 AA violations                                 |
| Performance   | Lighthouse CI                                                | Key pages                                                  | ≥ 95 in all four categories                                 |
| Security      | `pnpm audit`, gitleaks, CodeQL, Dependabot                   | Dependencies, history, code                                | No high-severity findings                                   |

Fast checks run in a pre-commit hook; the full suite runs in CI on every pull request and push.
`pnpm verify` runs the local equivalent of the static, architecture and unit gates plus the build.

## Consequences

- Business rules are tested without a browser; e2e tests stay few and focused on user flows.
- Gates are thresholds, not reports: a regression blocks the merge.
