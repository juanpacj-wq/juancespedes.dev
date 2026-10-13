# Runbook: the "Ask me" chat

How to turn it on, off and check what it costs ([ADR 0017](../adr/0017-ask-me-chat.md)).

## Turn it on

1. Create an account at platform.deepseek.com, top up a small amount (USD 5 lasts thousands of
   questions) and create an API key for this site only.
2. Store the key as a Worker secret (it never goes into the repository or GitHub):
   `pnpm exec wrangler secret put DEEPSEEK_API_KEY`
3. Run the evaluation locally with the same key (see below) and check it passes.
4. Set the repository variable `CHAT_ENABLED` to `true` (GitHub, Settings, Variables) and re-run
   the latest Deploy workflow. The section appears on both home pages.

To use Claude instead: store `ANTHROPIC_API_KEY` the same way, set the repository variable
`CHAT_MODEL` to `anthropic`, run the evaluation with that key, update the privacy notice
(`src/pages/privacidad.astro`, `src/pages/en/privacy.astro`) and the chat disclaimer, and deploy.

## Turn it off (kill switch)

Set `CHAT_ENABLED` to `false` and re-run the Deploy workflow. The section disappears and the
endpoint answers "disabled". For an immediate stop without a deploy, delete the secret:
`pnpm exec wrangler secret delete DEEPSEEK_API_KEY`; the endpoint then answers "disabled".

## Limits in force

| Limit              | Value              | Where                                 |
| ------------------ | ------------------ | ------------------------------------- |
| Human check        | every question     | Turnstile                             |
| Burst              | 3 per minute       | `CHAT_RATE_LIMITER` in wrangler.jsonc |
| Per visitor        | 10 per day         | `CHAT_VISITOR_DAILY_LIMIT`, KV        |
| Whole site         | 100 per day        | `CHAT_DAILY_LIMIT`, KV                |
| Question / history | 500 / 4 turns      | `src/domain/chat/question.ts`         |
| Tokens per answer  | 600 (Claude 4,000) | `CHAT_MAX_TOKENS`, unset by default   |
| Minimum balance    | USD 0.50           | `CHAT_MIN_BALANCE_USD`, pauses chat   |
| Spending           | prepaid credit     | DeepSeek console (top-ups)            |

Worst case per day is the site quota times the cost of the longest allowed answer: 100 questions
of 600 tokens, about USD 0.40 on DeepSeek. A normal answer costs about USD 0.0004.

## Low balance (automatic pause)

When the DeepSeek balance drops under `CHAT_MIN_BALANCE_USD`, the Worker stops sending questions
and visitors see "the assistant is paused" with the email. The `Chat budget` workflow checks
`https://juancespedes.dev/api/chat-status` every morning and opens an issue labeled
`chat-budget` (GitHub emails you); it never sees the key or the amount, only `on`, `off` or
`paused`.

To resume: top up at platform.deepseek.com. The balance is cached for ten minutes, so the chat
answers again within that time; the next check (or a manual run of the workflow) closes the
issue. To change the threshold, set a Worker variable with `--var CHAT_MIN_BALANCE_USD:<amount>`
in `deploy.yml`.

## Run the evaluation

```bash
DEEPSEEK_API_KEY=... pnpm eval:chat     # or ANTHROPIC_API_KEY=... CHAT_MODEL=anthropic
```

It builds the site, runs the 30 questions in `evals/chat/cases.yaml` with the production prompt
and corpus, prints each result and its cost, and writes `reports/chat-eval.json`. It fails under
27 of 30, above the average cost per question (USD 0.005 on DeepSeek, 0.08 on Claude), or on a
prompt cache miss after the first question of each language. Run it after any change to `chat-instructions.ts`, the corpus format, the model
or the effort.

Results of each run worth keeping go in `docs/evals/` (first run: [2026-10-13](../evals/chat-evaluation-2026-10-13.md),
30 of 30, USD 0.012 in total).

## Read what happened

Cloudflare dashboard, Workers & Pages, `juancespedes-dev`, Logs, search `chat.answer`. Each line
has the outcome, the timing and the token counts (input, output, cache read and write); never the
question or the answer. `chat.budget` lines mean the balance could not be read (the chat is
paused meanwhile). Spending is in the provider's console.
