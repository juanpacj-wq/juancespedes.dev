# 0024. Faster deploys: measure what visitors get, catch budget breaks locally, split CI

- Status: accepted
- Date: 2026-10-15
- Amends: [0013](0013-launch-hardening-and-operations.md) (CI triggers and jobs)

## Context

Shipping PR #39 took four CI rounds and about three and a half hours for a change that worked on
the first try. Every problem met on the way is recorded in
[docs/runbooks/deploy-friction.md](../runbooks/deploy-friction.md). The causes that cost the most:

- Lighthouse was the gate that failed, and CI was the only place it could run (Chrome on Windows
  fails with NO_NAVSTART), so each hypothesis cost a CI round of 8 to 11 minutes.
- The meter measured a site nobody visits: `astro preview` serves HTML and CSS without
  compression, while Cloudflare serves Brotli (the case study: 98 kB raw, 24 kB over the wire).
  The home page sat exactly on 0.95, and the same build scored 0.93 to 0.96 between runs.
- The usual causes of a failed budget (a render-blocking page stylesheet, an image that downloads
  with the page despite `loading="lazy"`, a heavier HTML) were only visible in the CI reports.
- Local end-to-end runs failed by overload, the pre-commit hook repeated the whole suite (2 to 5
  minutes per commit), CI ran the full suite again after every merge, and the e2e and Lighthouse
  jobs ran their work serially (4 minutes each).

## Decision

1. **Lighthouse measures compressed responses.** `scripts/preview-compressed.mjs` puts a proxy that
   compresses text with Brotli in front of `astro preview`, as the edge does; `lighthouserc.json`
   starts it. The 0.95 threshold does not change, only the meter. Running Lighthouse against the
   pull request's Cloudflare preview was rejected: it adds network variance to a meter that is
   already noisy, and previews of the chat use different variables.
2. **Lighthouse runs locally.** `pnpm lighthouse:local` runs Lighthouse in a Linux container
   against the compressed preview, at the same URLs as CI, and judges each page by the score
   estimated with TBT 0 from its best of three runs (`scripts/lib/lighthouse-score.mjs`; a
   busy workstation only makes runs worse).
3. **Page budgets in `pnpm verify`.** `pnpm pages:check` reads every page in `lighthouserc.json`
   from the build and fails on a render-blocking stylesheet other than the shared one, on an image
   with an address not declared part of the first screen (`loading="eager"`), and on HTML over its
   compressed budget. Images below the first screen keep their address in `data-src` and
   `data-srcset` until a script needs them.
4. **CI runs once per change, in parallel.** CI runs on pull requests only: the ruleset requires
   branches up to date with `main` and squash merges, so the tree that lands on `main` is the tree
   that passed. End-to-end runs one job per browser and Lighthouse one job per half of the pages;
   a job with the original name aggregates each, so the ruleset's required checks are unchanged.
   Browsers are cached per lockfile.
5. **Production deploys right after the merge**, as before: given point 4, waiting for a second CI
   run on `main` would delay every deploy by about 7 minutes and check nothing new.
6. **Fast local loop.** The pre-commit hook runs `lint-staged` on the staged files only. Playwright
   runs three workers and one retry locally; CI keeps two retries and lists every test that needed
   one (`scripts/flaky-summary.mjs`), so a flaky test is seen instead of hidden.

A single build job sharing `dist/` with the e2e and Lighthouse jobs was considered and measured:
the builds already run in parallel (40 to 75 s), so sharing one would add a serial step and save
no wall-clock time.

## Consequences

- A Lighthouse failure in CI should now be rare and is reproducible on the workstation in about
  three minutes; the budget gained real headroom (compression is what visitors get).
- CI on a pull request takes about half as long, and nothing runs twice for the same tree.
- Adding a page to `lighthouserc.json` needs a line in `HTML_BUDGET_KB` (scripts/check-pages.mjs)
  or it gets the default budget.
- The container's Playwright tag (`scripts/lighthouse/Dockerfile`) follows `@playwright/test`.
- If the ruleset ever stops requiring up-to-date branches or squash merges, point 5 no longer
  holds and production must wait for CI on `main`.
