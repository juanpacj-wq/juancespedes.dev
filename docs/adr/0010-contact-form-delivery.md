# 0010. Contact form: Email Routing, Turnstile and a rate limit, nothing stored

- Status: accepted
- Date: 2026-10-12

## Context

The contact form is the site's only write path and the main way freelance clients reach the
owner. It must deliver reliably, resist spam and abuse, keep personal data to a minimum (Colombian
Law 1581 of 2012) and work even without JavaScript. The plan originally named Resend for delivery.

## Decision

- **Delivery through Cloudflare Email Routing** (`send_email` binding) instead of a third-party
  email API. The binding can only send to the verified destination address declared in
  `wrangler.jsonc`, so the endpoint cannot be abused to email anyone else; there is no API key to
  leak and no extra vendor processing personal data. Messages go out as plain text with the
  visitor as `Reply-To`; the MIME builder strips CR/LF from every header value.
- **Cloudflare Turnstile** proves a human sent the form. The secret has no default: without it,
  verification fails closed. Local runs and CI use Cloudflare's documented test keys from
  `.dev.vars`; production uses a Worker secret and a real site key injected at build time.
- **Workers rate limiting** allows 5 submissions per minute per client IP. If the limiter itself
  errors, requests pass (Turnstile still protects the form), so an outage never silences clients.
- **Order of checks** in the use case: honeypot (silent fake success), rate limit, validation,
  CAPTCHA, delivery. Cheap checks first; the paid and slow ones last.
- **Same validation everywhere.** `validateContactRequest` lives in the domain; the React island
  runs it for instant feedback and the server runs it as the authority. Issues are codes,
  translated by the interface.
- **Progressive enhancement.** The island renders a real `<form method="post">`. Without
  JavaScript the endpoint answers with a 303 back to `#contact` and a status flag; with
  JavaScript it answers JSON, and errors follow RFC 9457 (`application/problem+json`).
- **Nothing stored.** The site keeps no database of messages. Logs record an event per
  submission (request ID, outcome, locale), never names, emails or message text.

## Consequences

- No email vendor account, API key or cost; Cloudflare already hosts the site and the domain.
- Changing the destination address means updating `wrangler.jsonc` and verifying the new address
  in Email Routing.
- The island ships React (about 64 kB gzip) only when the form scrolls into view, kept under the
  JavaScript budget enforced in CI.
