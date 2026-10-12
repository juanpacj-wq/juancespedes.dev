# 0003. Hosting on Cloudflare Workers with static assets

- Status: accepted
- Date: 2026-10-12

## Context

The site is static plus a few small endpoints, it also advertises freelance services (commercial
use), and it should cost nothing at current traffic. Vercel's Hobby plan excludes commercial use.

## Decision

Deploy with `@astrojs/cloudflare` to Cloudflare Workers with static assets. Static pages are
served from the edge cache; `/api/*` runs in the worker. Deployments go through GitHub Actions
with `wrangler`: every pull request uploads a preview version with its own URL, and `main`
deploys to production. The adapter's optional extras are switched off because the site does not
use them: no KV-backed sessions (`session: false`) and images optimized at build time
(`imageService: 'compile'`) instead of the Cloudflare Images binding.

## Consequences

- Free tier covers the expected traffic; no servers to maintain.
- Local preview runs the build on `workerd`, the production runtime, so e2e tests exercise the
  same code paths as production.
- Rollback is redeploying a previous version (`wrangler rollback`) or reverting the commit.
