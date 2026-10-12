# Runbook: monitoring and incidents

What watches the site, where to look and what to do (ADR 0013).

## Signals

| Signal           | Where                                                           | Who is told                |
| ---------------- | --------------------------------------------------------------- | -------------------------- |
| Site down        | `Uptime` workflow every 15 min, issue labeled `uptime`          | Owner, by GitHub email     |
| Browser errors   | Workers Logs, filter `event = client.error`                     | Nobody: read on a schedule |
| Server errors    | Workers Logs, level `error` (contact delivery, exceptions)      | Nobody: read on a schedule |
| Deployed version | `https://juancespedes.dev/api/health` (`version` is the commit) |                            |
| Traffic          | Cloudflare dashboard, Web Analytics, site `juancespedes.dev`    |                            |
| Security headers | `https://securityheaders.com/?q=juancespedes.dev` (target: A)   |                            |

## When the uptime issue opens

1. Open the linked run: it says which URL failed (health, `/` or `/en`).
2. `curl -sS https://juancespedes.dev/api/health`. A JSON answer with the expected commit means the
   Worker is up; a failing page then points at the asset layer or a bad deploy.
3. Check the last `Deploy` run. If the failure started with it, roll back as described in
   [deploy.md](deploy.md).
4. Check the Cloudflare status page for an incident in the Workers platform.
5. The issue closes itself on the first successful check; add a comment with the cause.

## Reading browser errors

Cloudflare dashboard, Workers & Pages, `juancespedes-dev`, Logs. Filter by
`$metadata.level = error` and search `client.error`. Each entry has the release (commit), page
path, script path and line. Reports from other origins are dropped by the endpoint, so what shows
up comes from this site's code.

## Changing the content security policy

The policy is built by `scripts/security-headers.mjs` from
`src/infrastructure/http/security-headers.ts`. To allow a new third party, add its origin there,
explain why in a comment, and run `pnpm build && pnpm test:e2e`: the security tests fail on any
policy violation.
