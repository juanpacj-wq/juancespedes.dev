# 0014. Mutation testing of the domain with Stryker

- Status: accepted
- Date: 2026-10-12

## Context

Domain and application code has 100 % line and branch coverage. Coverage says a line ran during a
test, not that a test would notice if the line were wrong. The domain holds the rules that keep
content honest (metrics need sources, periods are valid, contact input is bounded), so it is the
place where "tested" should mean "a wrong rule fails a test".

## Decision

- **Stryker mutates `src/domain/**`** and runs the domain and application unit tests against each
  mutant (`pnpm test:mutation`). Thresholds: break below 80 %, aim above 90 %.
- **Command runner, one Vitest process per mutant.** The Vitest plugin
  (`@stryker-mutator/vitest-runner` 10) reuses cached modules under Vitest 5 and never activated
  the mutants: an obvious mutant such as `if (false)` in the sort order "survived" and the score
  read 41 %. The command runner is slower (about ten minutes for some 400 mutants) but every
  result is real.
- **Weekly and on demand**, not on every pull request: the `Mutation testing` workflow runs on
  Mondays and from the Actions tab, fails under the threshold and keeps the HTML report for 30
  days. A pull request that changes the domain should run it locally.
- **Survivors are read, not just counted.** The first real run (90.7 %) found missing checks: a
  valid https link was never tested, exact length limits were not, an email with trailing text
  passed, issue messages were never asserted and the recency order lacked direct comparisons.
  `tests/unit/domain/rule-boundaries.test.ts` closes them. Remaining survivors are equivalent
  mutants, for example `if (false || issues.length > 0)` in `createProject`, where an invalid slug
  or month always adds an issue too.

## Consequences

- Mutation results are a weekly signal, so a regression in test strength can land and be caught
  days later. The unit suite and coverage still gate every pull request.
- The command runner is independent of Vitest internals, so a Vitest upgrade does not silently
  disable it again.
