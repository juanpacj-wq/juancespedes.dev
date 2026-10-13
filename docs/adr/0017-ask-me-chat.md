# 0017. "Ask me": a chat about the published work, with bounded cost

- Status: accepted
- Date: 2026-10-12

## Context

A recruiter asks "has he worked with Oracle?" and wants the answer and the case that proves it,
not a keyword search. A chat on the Claude API can do that, but a public endpoint to a paid model
invites abuse, and an assistant speaking for the owner must not invent work, leak the internal
details the case studies keep out, or talk about a job search the owner keeps discreet.

## Decision

- **Clean architecture like the contact form.** The use case `answerPortfolioQuestion` depends on
  ports: `ChatModel`, `PortfolioCorpus`, `ChatQuota`, `HumanVerifier`, `RateLimiter`. Checks run
  cheapest first: kill switch, validation, per-minute limit, Turnstile, daily quota; the model,
  the only paid step, runs last.
- **Provider: DeepSeek Flash by default, Claude as an alternative.** The plan named Claude Opus
  5.5 at effort `high`. Measured against the use, a portfolio assistant that answers from a given
  text, it costs about USD 0.03 per question; DeepSeek Flash with thinking off costs about USD
  0.0005 (cached input is almost free), so USD 5 covers thousands of questions. Its API is
  OpenAI-compatible (plain fetch, no SDK) and its context cache is automatic. The trade-off:
  questions go to servers in China, which the privacy notice states, and the interface asks
  visitors not to write personal data. Workers AI was ruled out because its free tier no longer
  includes the large models and the small ones answer worse. The Claude adapter stays
  (`CHAT_MODEL=anthropic`, streaming, server-side refusal fallback `fallbacks: "default"`), and the
  evaluation runs against either provider.
- **The corpus is generated at build time** from the same validated content as the pages
  (`/chat-corpus/<lang>.txt`): profile, services, every project with its page path, notes and the
  now page. It goes after the instructions in the system prompt, marked for prompt caching, and is
  byte-stable between requests, so after the first question each request pays mostly for itself.
  It is public information, so publishing the file is harmless; robots.txt keeps it out of search.
- **Instructions** (`chat-instructions.ts`) limit answers to the corpus, ask for the page path of
  each case cited, keep answers short and in the question's language, protect anonymized details,
  keep the job search out of it ("available for projects"), never give prices, and answer
  off-topic or manipulative questions with one exact sentence the evaluation can detect.
- **Cost and abuse limits**, in layers (the same for both providers): Turnstile on every question; 3 questions per minute per
  visitor (Workers rate limiting); daily quotas per visitor (10) and for the site (100) on
  Workers KV, failing closed; question of 500 characters at most, 4 turns of history of 1,500
  characters each; a cap per answer of 600 tokens on DeepSeek (answers measure 50 to 170) and
  4,000 on Claude, whose thinking counts toward it; the balance guard below; the provider's own
  spending limit (DeepSeek is prepaid); and the kill switch (`CHAT_ENABLED`). The visitor id is a salted, daily-rotating hash
  of the IP; the raw IP and the conversation are never stored. Logs keep token counts and timing,
  never questions or answers.
- **Balance guard.** On DeepSeek the Worker reads the account balance (`/user/balance`, cached ten
  minutes in KV) before the quota, and pauses the chat (`paused`, a 503 the interface explains)
  while it is under `CHAT_MIN_BALANCE_USD` (USD 0.50), failing closed if it cannot be read. The
  `chat-budget` workflow checks `/api/chat-status` every day and keeps an issue open while the
  chat is paused, so a drained balance is noticed without the key ever leaving Cloudflare. At the
  site cap a sustained attack costs about USD 0.40 a day at most.
- **Previews and tests never pay.** `CHAT_MODEL=fake` (the default) streams a deterministic
  answer from the same corpus, so the endpoint, quotas, interface and end-to-end tests run for
  free. Pull request previews force the fake model; production uses the real one only when
  `CHAT_ENABLED` is `true` and the key of the chosen provider exists as a Worker secret.
- **Quality is measured, not assumed.** `evals/chat/cases.yaml` holds 30 questions: skills that
  must link to the right case, profile, services and pricing, notes, facts the portfolio does not
  contain, discretion, confidentiality, off-topic questions and manipulation attempts. Grading is
  deterministic (string rules). `pnpm eval:chat` runs them against the real model with the
  production prompt and corpus and fails under 27 of 30, above an average cost per question of
  USD 0.005 on DeepSeek (0.08 on Claude), or if any request after the first one per language
  misses the prompt cache.
- **No UI framework beyond the existing island.** The chat is a React island on the home page,
  which already loads React for the contact form; answers render as escaped text and only paths of
  this site become links.

## Consequences

- Any change to the instructions, the corpus format, the model or the effort invalidates the cache
  and must be followed by `pnpm eval:chat`.
- KV counters are eventually consistent: under a burst a few questions may pass a limit. The
  per-minute limit and the balance guard bound the cost of that.
- The evaluation spends real money (30 questions per run, cents on DeepSeek) and is run by hand,
  not in CI.
- Switching provider is a variable (`CHAT_MODEL`) plus a key, and needs a new evaluation run and an
  update to the privacy notice.
