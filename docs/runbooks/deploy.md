# Deploy and rollback

## First-time setup (once)

1. Register `juancespedes.dev` with Cloudflare Registrar on the same account (the zone must be
   active there for the custom domain route).
2. Create a user API token from the **Edit Cloudflare Workers** template, scoped to this account
   and to the `juancespedes.dev` zone, plus **Zone > DNS > Edit** on that zone so the custom
   domain record can be created. Name it `github-actions-juancespedes-dev`.
3. Register the account's `workers.dev` subdomain (required for preview URLs). Either open
   Workers & Pages once in the dashboard, or:
   `curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"subdomain":"juancespedes"}' https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/subdomain`
4. In GitHub, repository **Settings > Secrets and variables > Actions**:
   - secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
     (`gh secret set NAME` reads the value from stdin, so it never appears in shell history);
   - variable `CLOUDFLARE_DEPLOY_ENABLED` = `true`.
5. Push to `main`. The `Deploy` workflow publishes the worker `juancespedes-dev` and attaches the
   custom domain declared in `wrangler.jsonc` (`routes` with `custom_domain: true`). GitHub creates
   the `preview` and `production` environments on first use; add a required reviewer to
   `production` if manual approval is wanted.
6. Verify: `curl https://juancespedes.dev/api/health` returns `{"status":"ok", ...}` with the
   commit SHA as `version`.

## Normal deploys

The goal is one CI round per change (ADR 0024). Before pushing:

1. `pnpm verify`: everything CI's quality and unit jobs check, plus the build and the JavaScript
   and page budgets (`pnpm pages:check`).
2. If the change touches a page in `lighthouserc.json`: `pnpm lighthouse:local` (Docker running;
   about 3 minutes for all pages, `RUNS=1 pnpm lighthouse:local en` for a quick look at one). It
   serves the build compressed, as CI and Cloudflare do, and reports the score estimated with
   TBT 0 from the best of three runs, because a busy workstation only makes runs worse.
3. `pnpm test:e2e --project=chromium` (add `--grep <path>` to narrow it); the full suite runs in CI,
   one job per browser.

Stop any `pnpm preview` before `pnpm build` (on Windows the running preview locks `dist/`), and
run builds, end-to-end tests and Lighthouse one at a time.

Then:

- Pull request: CI (about 4 minutes) and the workflow that uploads a preview version and comments
  its URL on the PR. CI lists any test that passed only on a retry in the job summary.
- Merge to `main` (squash, branch up to date: the ruleset enforces both, so the merged tree is the
  tested tree): production deploy, without a second CI run. `/api/health` shows the new SHA within
  about two minutes.
- If Lighthouse fails in CI: `gh run download <run> -p 'lighthouse-reports-*'`, read every failing
  metric and audit, reproduce with `pnpm lighthouse:local`, fix everything in one push.

## Rollback

1. Find the last good version: `pnpm exec wrangler deployments list`.
2. Roll back: `pnpm exec wrangler rollback <version-id> --message "reason"`.
3. Verify `/api/health` reports the old SHA.
4. Revert the offending commit on `main` so the next deploy does not reintroduce it.
