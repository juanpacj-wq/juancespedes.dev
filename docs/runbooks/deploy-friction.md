# Deploy friction log (PR #39, 2026-10-14)

Every problem met while shipping the case study redesign (PR #39), with its measured cost, its
cause and the permanent fix proposed. The goal is a deploy that takes one CI round, not five.
Status of each fix: **open** until it is implemented.

## Timeline of this deploy

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

## 1. Lighthouse is the gate that fails, and CI is the only meter

- **Cost:** one CI round per hypothesis (8 to 11 min). PR #34 needed six rounds; PR #39 failed
  its first round on performance (home 0.94, case study 0.90 and 0.92; minimum 0.95).
- **Cause:** Lighthouse does not run on the Windows workstation (NO_NAVSTART), and the home page
  sits exactly on the 0.95 line, so any byte added before the first paint fails the merge.
- **Found during this deploy:** Lighthouse runs fine in a Linux container against the local
  preview (recipe below). Each run takes about 25 s, and the scores for the case study matched CI
  (0.88 to 0.91 locally, 0.90 in CI).
- **Caveat:** on a busy workstation the simulated CPU time inflates TBT (250 to 2000 ms locally,
  0 in CI) and FCP (about +250 ms). Read FCP, LCP and CLS, compare pages within the same batch, and
  estimate the CI score with TBT set to 0 (`score.cjs` below reproduces the Lighthouse 12 mobile
  formula: it gives 0.965 for main's case study and 0.905 for PR #39's first round, as CI did).
- **Permanent fix (open):** add `pnpm lighthouse:local` to the repository: the Dockerfile, the
  container script and the score estimate, documented in `docs/runbooks/deploy.md`. Run it before
  every push that touches a page in `lighthouserc.json`.

Recipe used in this session:

```dockerfile
# lh-local: Lighthouse with the Playwright image's Chromium, installed once (npx on a Windows
# bind mount took about 4 min per run).
FROM mcr.microsoft.com/playwright:v1.64.0-noble
RUN npm i -g lighthouse@12 && ln -s "$(ls -d /ms-playwright/chromium-*/chrome-linux*/chrome | head -1)" /usr/local/bin/chrome-lh
ENV CHROME_PATH=/usr/local/bin/chrome-lh
```

```bash
# Inside the container. Chrome always resolves "localhost" to loopback (host-resolver-rules are
# ignored for it) and the preview answers 403 to any other Host header, so a TCP proxy forwards
# loopback:4331 to the Windows host and the URLs stay identical to CI's.
node -e "const n=require('net');n.createServer(c=>{const u=n.connect(4331,'host.docker.internal');c.pipe(u).pipe(c);c.on('error',()=>u.destroy());u.on('error',()=>c.destroy());}).listen(4331,'127.0.0.1')" &
lighthouse http://localhost:4331/ --only-categories=performance \
  --chrome-flags="--headless=new --no-sandbox" --output json --output-path /out/home.json
```

On the host: `pnpm preview --port 4331 --host 0.0.0.0` (the default binds to `[::1]` only, which
the container cannot reach), then `docker run --rm --add-host=host.docker.internal:host-gateway
-v <out>:/out lh-local bash /lh.sh`.

## 2. The CI meter measures an uncompressed site

- **Cost:** it is the main reason the budget has no headroom. `astro preview` (workerd) serves
  HTML and CSS without compression; Lighthouse reports "uses-text-compression: 157 KiB" on the
  case study. Under the simulated mobile network (about 200 kB/s) every 10 kB of HTML costs about
  50 ms of FCP. Production (Cloudflare) serves Brotli, so the gate punishes bytes users never
  download: the case study HTML is 97 kB raw and about 20 kB compressed.
- **Permanent fix (open, needs a decision):** measure what users get. Either put a compressing
  proxy in front of the preview in the Lighthouse job, or run Lighthouse against the PR's
  Cloudflare preview URL (real edge, real compression, already deployed by the Deploy workflow).
  Keep the 0.95 threshold; only the meter changes.

## 3. Home page regressions are invisible until CI

PR #39 regressed the home page from 0.95 to 0.94 (LCP 2.58 s to 2.66 s) without touching it
directly:

- a real card screenshot (17 kB) replaced the drawn placeholder; `loading="lazy"` did not stop it,
  because Chrome's look-ahead distance on slow connections (about 2500 px) reaches the cards;
- the shared stylesheet grew 1 kB with utilities used only by the case study.

**Fixed in PR #39:** the card screenshot waits in `data-src`/`data-srcset` until the cards come
near (the same observer that loads `cards.css`). **Rule to add to CLAUDE.md (open):** a lazy image
is not enough to keep bytes out of the first load; anything below the first screen that the page
does not need at first paint loads from an observer.

## 4. Case study: a new render-blocking stylesheet and a doubled HTML

First CI round: FCP 1.8 s on main became 2.5 s, CLS 0.046 became 0.08.

- `case-study.css` (22 kB) was imported by the component, so Astro linked it in `<head>` and it
  blocked rendering (about 600 ms). **Fixed:** split into `case-study-hero.css` (under 4 kB, inlined
  by Astro) and the chapters' sheet, loaded by the page script, with a `<noscript>` fallback.
- The logo band drew each SVG path twice (the second round of the loop): 37 kB of HTML. **Fixed:**
  one `<symbol>` per logo, reused by both rounds with `<use>` (HTML 112 kB to 97 kB).
- Geist arriving after the first paint reflowed the hero (CLS 0.08). Preloading Geist fixed the
  shift but put 31 kB in front of the render-blocking CSS. **Fixed instead with** a metric-matched
  fallback face (`Geist Fallback`, Arial resized with `size-adjust` and the overrides measured with
  `@capsizecss/unpack`), site-wide, with no network cost.
- `?url` imports of the same CSS from the frontmatter and from a client script produce two
  different files (different hashes, and the client copy lacks `-webkit-backdrop-filter`). **Fixed:**
  the script reads the URL the server rendered (`data-chapter-styles`).
- Round 2 (home 0.95, case study 0.94, FCP 2.15 to 2.3 s): the chapters' sheet (20 kB, requested
  at 174 ms), the first two gallery images (18 kB, the same look-ahead as the home card) and the
  motion script (13 kB) still downloaded before the first paint. **Fixed:** the chapters' sheet
  loads on the `load` event or the first scroll, tap or key, whichever comes first; the motion code
  is imported once it applies; the gallery's screenshots get their address when the gallery
  starts (noscript copies for readers without JavaScript). `.cs-article { overflow-x: clip }` moved
  to the inlined sheet so the page never scrolls sideways while the other one loads.

**Permanent fix (open):** extend `scripts/check-bundle.mjs` into a page budget that fails
`pnpm verify` locally when a page in `lighthouserc.json` has a render-blocking stylesheet other
than the shared one, a raw HTML size above a threshold (home 150 kB, case study 100 kB), or an
`<img>` with `src` below the first screen. That turns the most common Lighthouse failures into a
2 s local check.

- Round 3: Lighthouse passed, but axe failed on every case study page. Loading the chapters'
  sheet late changed what the page looks like between the load event and the sheet: the logo
  names (`opacity: 0` with a 300 ms transition) faded out when the sheet arrived and axe measured
  them half drawn (contrast 1.06), and for a few frames the logo band was a scroll region that
  could not be focused. **Fixed:** nothing in the article transitions until a frame has been
  drawn with the sheet (`data-chapters-ready`), and the band is marked live before its styles
  apply. **Lesson:** deferring a stylesheet changes the page's states; run the axe suite for the
  affected pages locally before pushing (`--grep` on the path, about 5 min).
- **Open, found on the way:** without JavaScript the logo band is a scrollable row that the
  keyboard cannot focus (axe `scrollable-region-focusable`). The lint preset forbids `tabindex`
  on a non-interactive element, so the fix needs a decision (a lint exception for scroll regions,
  or a different markup).
- **Also measured:** the CI meter is noisy by itself. The same build scored 0.93, 0.94 and 0.96 on
  the case study in round 3 (FCP 2.13 to 2.35 s); lhci asserts on the representative run, so a
  page at 0.95 passes or fails by luck. Headroom (section 2) is the only real fix.

## 5. Local end-to-end runs fail by overload, not by bugs

- **Cost:** 8 min for the full suite, with 13 failures that were all timeouts; all passed on a
  rerun with `--workers=2` (1.6 min).
- **Cause:** `fullyParallel` with the default worker count (half of 14 cores: 7 workers), three
  browsers and workerd on one Windows machine.
- **Permanent fix (open):** in `playwright.config.ts`, `workers: process.env.CI ? undefined : 3`,
  and `retries: 1` locally so a timeout is retried before it is reported.
- **A real flaky test, hidden by CI's retries:** `projects.spec.ts` "the solution shows real
  screenshots..." fails on WebKit about one run in two even alone (`--workers=1`): the gallery tab
  is "not stable" when clicked. It failed before and after the PR #39 fixes; CI passes it only
  because `retries: 2` reruns it. **Fix (open):** wait for the gallery to settle (or pause its
  autoplay) before clicking, and report flaky tests in CI instead of letting retries hide them.

## 6. The pre-commit hook repeats what `pnpm verify` just did

- **Cost:** 149 s and 301 s for the two commits of PR #39 (format, lint, architecture and unit
  tests), right after the same checks passed on the same tree. Every fix commit in a failing PR
  pays it again.
- **Permanent fix (open):** keep the hook fast: `lint-staged` with Prettier and ESLint on the
  staged files only, and leave the full suite to `pnpm verify` and CI.

## 7. Windows-only traps that cost minutes

- `pnpm build` fails with `EPERM ... rmSync dist/client` while `pnpm preview` is running (workerd
  holds the directory). Stop the preview before building.
- Astro 7 refuses a second `astro preview` while one runs ("Run `astro preview stop`"), so
  Playwright's `webServer` fails to start if a manual preview is still open on another port.
- Git Bash rewrites arguments that look like POSIX paths: a URL path `/` passed to a Node script
  became `C:/Program Files/Git/`. Use `MSYS_NO_PATHCONV=1` in scripts that pass URL paths.
- `pnpm build` took between 28 s and 203 s on the same tree depending on other work on the
  machine (image optimization dominates). Run builds, Lighthouse and e2e one at a time.

## 8. Slow steps in CI itself

- The e2e job (about 7 min) is the critical path: `playwright install --with-deps chromium webkit`
  downloads the browsers on every run. **Fix (open):** cache `~/.cache/ms-playwright` keyed on the
  Playwright version, or run the job in the `mcr.microsoft.com/playwright` image.
- Each job installs dependencies and three of them build the site again (e2e, Lighthouse, Deploy).
  **Fix (open):** one build job that uploads `dist/` as an artifact for e2e and Lighthouse.
- After the merge, CI runs again in full on `main` (7 min) while Deploy publishes in parallel,
  without waiting for it. **Fix (open, needs a decision):** either deploy only after CI passes on
  `main` (`workflow_run`, or deploy as a job of CI), or skip the duplicate run when the merged tree
  equals the PR's tested tree.

## Proposed order

1. Page budget in `pnpm verify` (4) and `pnpm lighthouse:local` (1): failures found in seconds or
   minutes, before pushing.
2. Measure compressed responses in CI (2): gives the budget real headroom.
3. Playwright workers and retries (5), fast pre-commit hook (6).
4. CI caching, a single build and deploy after CI (8).
