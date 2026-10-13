import {
  ANTHROPIC_API_KEY,
  CHAT_DAILY_LIMIT,
  CHAT_EFFORT,
  CHAT_ENABLED,
  CHAT_MAX_TOKENS,
  CHAT_MODEL,
  CHAT_MODEL_ID,
  CHAT_VISITOR_DAILY_LIMIT,
  CHAT_VISITOR_PEPPER,
  DEEPSEEK_API_KEY,
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import { env } from 'cloudflare:workers';

import { makeAnswerPortfolioQuestion } from '../application/use-cases/answer-portfolio-question';
import { makeAnthropicChatModel } from '../infrastructure/ai/anthropic-chat-model';
import { makeAssetPortfolioCorpus } from '../infrastructure/ai/asset-portfolio-corpus';
import { makeDeepSeekChatModel } from '../infrastructure/ai/deepseek-chat-model';
import { fakeChatModel } from '../infrastructure/ai/fake-chat-model';
import { makeChatEndpoint } from '../infrastructure/http/chat-endpoint';
import { makeCloudflareRateLimiter } from '../infrastructure/security/cloudflare-rate-limiter';
import { makeKvChatQuota, visitorKey } from '../infrastructure/security/kv-chat-quota';
import { makeTurnstileVerifier } from '../infrastructure/security/turnstile-verifier';

/**
 * Composition for "Ask me" (ADR 0017). CHAT_MODEL picks the provider: "deepseek" (the default in
 * production), "anthropic", or "fake" (free, for local runs, previews and tests). A real provider
 * is used only when the chat is enabled and its API key exists; otherwise the endpoint answers
 * "disabled".
 */
const CONTACT_EMAIL = 'juanpablocespedesj@gmail.com';
const today = () => new Date().toISOString().slice(0, 10);

const providerReady =
  CHAT_MODEL === 'fake' ||
  (CHAT_MODEL === 'deepseek' && Boolean(DEEPSEEK_API_KEY)) ||
  (CHAT_MODEL === 'anthropic' && Boolean(ANTHROPIC_API_KEY));

const model =
  CHAT_MODEL === 'deepseek'
    ? makeDeepSeekChatModel({
        apiKey: DEEPSEEK_API_KEY ?? '',
        model: CHAT_MODEL_ID || 'deepseek-flash',
        maxTokens: CHAT_MAX_TOKENS,
        contactEmail: CONTACT_EMAIL,
      })
    : CHAT_MODEL === 'anthropic'
      ? makeAnthropicChatModel({
          apiKey: ANTHROPIC_API_KEY ?? '',
          model: CHAT_MODEL_ID || 'claude-opus-5-5',
          effort: CHAT_EFFORT,
          maxTokens: CHAT_MAX_TOKENS,
          contactEmail: CONTACT_EMAIL,
        })
      : fakeChatModel;

const answer = makeAnswerPortfolioQuestion({
  enabled: CHAT_ENABLED && providerReady,
  model,
  corpus: makeAssetPortfolioCorpus((path) =>
    env.ASSETS.fetch(new URL(path, 'https://assets.local').href),
  ),
  quota: makeKvChatQuota({
    kv: env.CHAT_QUOTA,
    perVisitor: CHAT_VISITOR_DAILY_LIMIT,
    perDay: CHAT_DAILY_LIMIT,
    today,
  }),
  // A missing secret fails closed: an empty secret never verifies a token.
  verifier: makeTurnstileVerifier({ secret: TURNSTILE_SECRET_KEY ?? '', fetch }),
  rateLimiter: makeCloudflareRateLimiter(env.CHAT_RATE_LIMITER),
});

export const handleChatRequest = makeChatEndpoint({
  answer,
  visitorKeyFor: (ip) => visitorKey(ip, today(), CHAT_VISITOR_PEPPER ?? 'local'),
  log: (entry) => {
    console.log(JSON.stringify(entry));
  },
  newId: () => crypto.randomUUID(),
  now: () => Date.now(),
});
