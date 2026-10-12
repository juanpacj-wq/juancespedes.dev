# Deploy and rollback

## First-time setup (once)

1. In Cloudflare, create an API token with the **Edit Cloudflare Workers** template.
2. In GitHub, repository **Settings > Secrets and variables > Actions**:
   - secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`;
   - variable `CLOUDFLARE_DEPLOY_ENABLED` = `true`.
3. Create the environments `preview` and `production` (Settings > Environments). Add a required
   reviewer to `production` if manual approval is wanted.
4. Push to `main`. The `Deploy` workflow publishes the worker `juancespedes-dev`.
5. Custom domain: Workers & Pages > `juancespedes-dev` > Settings > Domains & Routes > add
   `juancespedes.dev` (the domain must be on the same Cloudflare account).
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
