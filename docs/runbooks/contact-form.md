# Contact form is not delivering

## Symptoms

Visitors report an error after sending, or messages stop arriving at the owner's inbox.

## Diagnosis

1. Live logs: `pnpm exec wrangler tail juancespedes-dev --format json` and submit a test message.
   Each attempt logs `{"event":"contact.submission","outcome":...}` with a request ID.
2. Read the outcome:
   - `verification-failed` on every attempt: Turnstile secret missing or wrong, or the page was
     built with the test site key. Check `wrangler secret list` (expects `TURNSTILE_SECRET_KEY`)
     and the GitHub variable `PUBLIC_TURNSTILE_SITE_KEY`.
   - `delivery-failed`: the `cause` field holds the binding error. Usually Email Routing is
     disabled or the destination address is no longer verified.
   - `rate-limited`: more than 5 attempts per minute from one IP; expected under abuse.
3. Email Routing status: Cloudflare dashboard > juancespedes.dev > Email Routing > Overview
   (routing enabled, DNS records present, destination verified).

## Fix

1. Turnstile secret: `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY` (value from the
   Turnstile widget page). Verify with a test submission.
2. Site key: update the GitHub variable `PUBLIC_TURNSTILE_SITE_KEY` and redeploy `main`.
3. Email Routing: re-enable it and add missing DNS records from its Settings tab; re-verify the
   destination address. Verify with a test submission and the inbox.

## Afterwards

Note the cause and the fix in the pull request or issue that tracks it.
