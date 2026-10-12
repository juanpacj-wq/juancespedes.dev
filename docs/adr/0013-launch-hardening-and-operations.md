# 0013. Launch: security headers, monitoring without third parties, and releases

- Status: accepted
- Date: 2026-10-12

## Context

Version 1.0 needs what a reviewer checks first on a production site: security headers, a way to
know when the site is down or failing, privacy-friendly analytics and a tagged release. The plan
named Sentry for errors and a hosted uptime monitor. Two facts weighed against them: the
JavaScript budget (75 kB gzip, 69.7 kB used) has no room for a browser error SDK, and every new
vendor is another processor of visitor data and another account to manage. Separately, the
release workflow failed on every push: GitHub Actions was not allowed to open pull requests, and
pull requests opened with `GITHUB_TOKEN` trigger no workflows, so a release PR could never pass
the required checks.

## Decision

- **Security headers everywhere.** HSTS (two years, preload), `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, a restrictive `Permissions-Policy`, COOP and a
  content security policy. Static pages are served by the asset layer without running the
  Worker, so `scripts/security-headers.mjs` writes them into `dist/client/_headers` after the
  build; `src/middleware.ts` adds the same set to Worker responses. One module
  (`src/infrastructure/http/security-headers.ts`) holds the shared values.
- **CSP without `unsafe-inline` for scripts.** The build step hashes (SHA-256) every inline script
  Astro emitted and lists exactly those hashes; any other inline script is refused. Styles keep
  `'unsafe-inline'` (Astro's scoped styles; styles cannot run code). Third parties are only
  Turnstile and Cloudflare Web Analytics. `upgrade-insecure-requests` is left out on purpose:
  every URL is already https, and WebKit applies the directive to `http://localhost`, which breaks
  previews and tests. An e2e test loads the pages while recording `securitypolicyviolation`.
- **Errors go to Workers Logs instead of Sentry.** A 1 kB script reports uncaught errors and
  unhandled rejections with `sendBeacon` to `/api/client-errors`: message, script path, line, page
  path and release; never anything about the visitor. The endpoint validates and truncates the
  report, drops paths from other origins (extensions), rate-limits by IP and logs it as a JSON
  line with level `error`, kept and searchable in Workers Logs next to the server's own logs.
- **Uptime from outside Cloudflare.** A scheduled GitHub Actions workflow checks the health
  endpoint and both home pages every 15 minutes, with retries. A failure opens an issue labeled
  `uptime`, which notifies the owner by email; recovery closes it.
- **Analytics: Cloudflare Web Analytics**, cookieless and without personal data, as the privacy
  notice says. Automatic installation at the edge does not reach pages served by the Worker's
  asset layer, so the beacon is in the layout, rendered only when `PUBLIC_WEB_ANALYTICS_TOKEN` is
  set. The deploy sets it for production only, so tests and previews never count page views. The
  CSP allows its script and endpoint.
- **Releases through release-please, with the same gates as any change.** Actions may open pull
  requests. After creating or updating the release PR, the release workflow dispatches CI, CodeQL
  and the title check on the release branch (`workflow_dispatch` is the event `GITHUB_TOKEN` is
  allowed to trigger). No personal access token is stored. Version 1.0.0 is pinned with
  `release-as` for the launch and the pin is removed afterwards.

## Consequences

- The policy changes whenever an inline script changes; the hashes are recomputed on every build,
  so this needs no manual work, but a script injected after the build is blocked by design.
- Error reports have no alerting of their own; they are read in the Workers Logs dashboard. The
  uptime monitor is what pages the owner. If traffic grows, a hosted tracker can replace the
  endpoint without touching the pages beyond the reporter script.
- Allowing Actions to open pull requests also lets workflows approve them. The ruleset requires no
  approvals, and every workflow runs with read-only default permissions unless it asks for more.
