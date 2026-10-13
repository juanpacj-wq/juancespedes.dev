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
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import { env } from 'cloudflare:workers';

import { makeAnswerPortfolioQuestion } from '../application/use-cases/answer-portfolio-question';
import { makeAnthropicChatModel } from '../infrastructure/ai/anthropic-chat-model';
import { makeAssetPortfolioCorpus } from '../infrastructure/ai/asset-portfolio-corpus';
import { fakeChatModel } from '../infrastructure/ai/fake-chat-model';
import { makeChatEndpoint } from '../infrastructure/http/chat-endpoint';
import { makeCloudflareRateLimiter } from '../infrastructure/security/cloudflare-rate-limiter';
import { makeKvChatQuota, visitorKey } from '../infrastructure/security/kv-chat-quota';
import { makeTurnstileVerifier } from '../infrastructure/security/turnstile-verifier';

/**
 * Composition for "Ask me" (ADR 0017). The real model is used only when the chat is enabled, the
 * model is set to "anthropic" and an API key exists; otherwise the endpoint answers "disabled"
 * (or uses the free fake model when CHAT_MODEL is "fake").
 */
const CONTACT_EMAIL = 'juanpablocespedesj@gmail.com';
const today = () => new Date().toISOString().slice(0, 10);

const useAnthropic = CHAT_MODEL === 'anthropic' && Boolean(ANTHROPIC_API_KEY);

const model = useAnthropic
  ? makeAnthropicChatModel({
      apiKey: ANTHROPIC_API_KEY ?? '',
      model: CHAT_MODEL_ID,
      effort: CHAT_EFFORT,
      maxTokens: CHAT_MAX_TOKENS,
      contactEmail: CONTACT_EMAIL,
    })
  : fakeChatModel;

const answer = makeAnswerPortfolioQuestion({
  enabled: CHAT_ENABLED && (CHAT_MODEL === 'fake' || useAnthropic),
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
