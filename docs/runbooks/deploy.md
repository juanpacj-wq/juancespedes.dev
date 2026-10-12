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

- Pull request: the workflow uploads a preview version and comments its URL on the PR.
- Merge to `main`: production deploy. `/api/health` shows the new SHA within a minute.

## Rollback

1. Find the last good version: `pnpm exec wrangler deployments list`.
2. Roll back: `pnpm exec wrangler rollback <version-id> --message "reason"`.
3. Verify `/api/health` reports the old SHA.
4. Revert the offending commit on `main` so the next deploy does not reintroduce it.
