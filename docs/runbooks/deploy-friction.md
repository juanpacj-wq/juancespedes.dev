# Deploy friction log (PR #39, 2026-10-14)

Every problem met while shipping the case study redesign (PR #39), with its measured cost, its
cause and its permanent fix. The goal is a deploy that takes one CI round, not four. All fixes
were implemented on 2026-10-15 (ADR 0024); the day-to-day procedure is in
[deploy.md](deploy.md).

## Status

| #   | Problem                                      | Fix                                                                | Status |
| --- | -------------------------------------------- | ------------------------------------------------------------------ | ------ |
| 1   | CI was the only Lighthouse meter             | `pnpm lighthouse:local` (Docker, same URLs as CI, TBT-0 estimate)  | Done   |
| 2   | The meter measured an uncompressed site      | `scripts/preview-compressed.mjs` (Brotli, as Cloudflare) in lhci   | Done   |
| 3   | Home regressions invisible until CI          | `pnpm pages:check` in `pnpm verify`; rule in CLAUDE.md             | Done   |
| 4   | Case study budget breaks found one per round | Same check; deferred styles and images; axe-safe style arrival     | Done   |
| 4b  | Logo band without JavaScript: unfocusable    | Without the script the band wraps; it is no longer a scroll region | Done   |
| 5   | Local e2e failed by overload; a hidden flaky | 3 workers and 1 retry locally; flaky summary in CI; test fixed     | Done   |
| 6   | Pre-commit hook repeated the whole suite     | `lint-staged` on staged files                                      | Done   |
| 7   | Windows traps                                | Scripts avoid them; the rest is in deploy.md                       | Done   |
| 8   | Slow CI, second run on main                  | Jobs split by browser and by page group; no CI run after the merge | Done   |

## Timeline of the PR #39 deploy

| Step                                                  | Time               |
| ----------------------------------------------------- | ------------------ |
| `pnpm verify` steps, run one by one                   | 3 min              |
| `pnpm test:e2e`, full suite (13 false failures)       | 8 min              |
| Rerun of the failed e2e tests with `--workers=2`      | 1.6 min            |
| `git commit` (pre-commit hook repeats verify's steps) | 2.5 min            |
| CI round 1 (Lighthouse failed, everything else green) | 8 min              |
| Local Lighthouse in Docker: setup and calibration     | about 20 min, once |
| Fixes, local checks and `git commit` (hook: 301 s)    | about 50 min       |
| CI round 2 (home 0.95 passed, case study 0.94)        | 6 min              |
| Second set of fixes, local checks                     | about 30 min       |
| CI round 3 (Lighthouse passed, axe failed)            | 7 min              |
| Accessibility fixes, local checks, commit             | about 25 min       |
| CI round 4 (green), merge, production deploy          | 8 min              |

## 1. Lighthouse was the gate that failed, and CI was the only meter

- **Cost:** one CI round per hypothesis (8 to 11 min). PR #34 needed six rounds; PR #39 failed
  its first round on performance (home 0.94, case study 0.90 and 0.92; minimum 0.95).
- **Cause:** Lighthouse does not run on the Windows workstation (NO_NAVSTART).
- **Fix:** `pnpm lighthouse:local` (`scripts/lighthouse-local.mjs`). It builds the image in
  `scripts/lighthouse/Dockerfile` once, serves the build compressed, runs Lighthouse in the
  container against the same `http://localhost:4331` URLs as CI (a TCP proxy inside the container,
  because Chrome always resolves `localhost` to itself and the preview rejects other host names),
  and judges each page by its best run of three, scored with TBT 0
  (`scripts/lib/lighthouse-score.mjs`, unit-tested against CI's own reports: 0.965, 0.905, 0.95).
- **Caveat that stays:** on a busy workstation the simulated CPU time inflates TBT (250 to
  2900 ms locally, 0 in CI) and FCP, and Chrome now and then fails to record a trace (one retry
  per run covers it). The estimate ignores TBT for that reason.
- **Found while building it:** `spawnSync` for Docker blocked the orchestrator, nobody read the
  preview's request log, and on Windows (pipe writes block) the preview froze after about eleven
  runs. Docker now runs asynchronously and the preview stops echoing its request log once ready.

## 2. The CI meter measured an uncompressed site

- **Cost:** the main reason the budget had no headroom. `astro preview` (workerd) serves HTML and
  CSS without compression; under the simulated mobile network every 10 kB costs about 50 ms of
  FCP. Production serves Brotli: the case study is 98 kB raw and 24 kB over the wire.
- **Fix:** `scripts/preview-compressed.mjs` starts the preview on an inner port and compresses
  text responses with Brotli in front of it; `lighthouserc.json` starts it. The threshold stays at
  0.95. Measured locally with it, the pages estimate 0.99 instead of 0.94 to 0.95. Running
  Lighthouse against the Cloudflare preview URL was rejected (network variance on top of a noisy
  meter).
- **Also measured:** the meter is noisy by itself (the same build scored 0.93, 0.94 and 0.96 in one
  round); headroom is what makes that harmless.

## 3. Home page regressions were invisible until CI

PR #39 regressed the home page from 0.95 to 0.94 without touching it directly: a card screenshot
(17 kB) downloaded with the page despite `loading="lazy"` (Chrome's look-ahead on slow connections
is about 2500 px), and the shared stylesheet grew 1 kB.

- **Fixed in PR #39:** card screenshots wait in `data-src`/`data-srcset` for the cards' observer.
- **Fix:** `pnpm pages:check` (in `pnpm verify` and in CI) fails when an image with an address is
  not declared part of the first screen (`loading="eager"`). The rule is in CLAUDE.md.

## 4. Case study: budget breaks found one per CI round

Round 1 (FCP 1.8 s to 2.5 s, CLS 0.08): a 22 kB render-blocking stylesheet, logos drawn twice in
the HTML, Geist reflowing the hero. Round 2 (0.94): the chapters' sheet, two gallery screenshots
and the motion script still downloaded before the first paint. Round 3: deferring the sheet made
the logo names fade while axe measured them, and left the band briefly unfocusable. All fixed in
PR #39 (inlined first-screen styles, sheet after `load`, one `<symbol>` per logo, a fallback face
with Geist's metrics, transitions held until the sheet applies).

- **Fix:** `pnpm pages:check` reports a render-blocking stylesheet other than the shared one, any
  image that downloads with the page, and HTML over its Brotli budget (per page, in
  `scripts/check-pages.mjs`), in about two seconds. The next case's screen at the end of the page
  now waits like the gallery's, so the rule has no exceptions.

## 4b. The logo band without JavaScript

- **Problem:** a scrollable row the keyboard could not focus (axe `scrollable-region-focusable`);
  the lint preset forbids `tabindex` on a non-interactive element.
- **Fix:** without the script the band is not a scroll region at all: the logos wrap, still, and
  the copy that closes the loop is hidden. An e2e test runs axe on two case studies with
  JavaScript disabled.

## 5. Local end-to-end runs failed by overload, and a flaky test hid behind retries

- **Cost:** 8 min for the full suite with 13 false failures (timeouts).
- **Fix:** three workers and one retry locally (`playwright.config.ts`). CI keeps two retries and
  `scripts/flaky-summary.mjs` turns every test that needed one into a warning and a line in the
  job summary.
- **The flaky test:** "the solution shows real screenshots..." failed on WebKit about one run in
  two: the page scrolls smoothly (`scroll-behavior: smooth`), so Playwright's scroll before each
  click is animated and the target is "not stable"; the gallery's auto-advance moves the row too.
  The test now runs with reduced motion, which keeps the tabs and the enlarged view. The sitemap
  test visits about 30 pages and is marked slow.

## 6. The pre-commit hook repeated the whole suite

- **Cost:** 124 s to 301 s per commit, right after `pnpm verify` passed on the same tree.
- **Fix:** `.githooks/pre-commit` runs `lint-staged` (`lint-staged.config.mjs`): Prettier and
  ESLint on the staged files, the token check when styles or markup change.

## 7. Windows-only traps

- `pnpm build` fails with `EPERM` while a preview holds `dist/`: `pnpm lighthouse:local` ends its
  whole process tree, and deploy.md says to stop any preview before building.
- `pnpm exec` goes through `cmd.exe`; when the intermediate process ends first, the child is
  orphaned. `preview-compressed.mjs` starts Astro's entry point with Node directly.
- Git Bash rewrites `/en` into `C:/Program Files/Git/en`: `pnpm lighthouse:local` undoes that and
  accepts paths without the leading slash.
- Builds took 28 s to 203 s on the same tree depending on other work: deploy.md says to run
  builds, end-to-end tests and Lighthouse one at a time.

## 8. Slow CI and a second run on main

Measured per step: e2e spent 40 s building, 38 s installing browsers and 240 s testing; Lighthouse
76 s building and 240 s on 18 runs.

- **Fix:** one e2e job per browser and one Lighthouse job per half of the pages, each aggregated
  by a job with the original name, so the ruleset's required checks did not change. Browsers are
  cached per lockfile.
- **Fix:** CI runs on pull requests only. The ruleset requires squash merges of branches up to
  date with `main`, so the merged tree is the tested tree; production still deploys right after the
  merge.
- **Rejected after measuring:** a single build job sharing `dist/`. The builds already run in
  parallel, so sharing one adds a serial step and saves no wall-clock time.
