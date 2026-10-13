import {
  ANTHROPIC_API_KEY,
  CHAT_DAILY_LIMIT,
  CHAT_EFFORT,
  CHAT_ENABLED,
  CHAT_MAX_TOKENS,
  CHAT_MIN_BALANCE_USD,
  CHAT_MODEL,
  CHAT_MODEL_ID,
  CHAT_VISITOR_DAILY_LIMIT,
  CHAT_VISITOR_PEPPER,
  DEEPSEEK_API_KEY,
  TURNSTILE_SECRET_KEY,
} from 'astro:env/server';
import { env } from 'cloudflare:workers';

import { makeAnswerPortfolioQuestion } from '../application/use-cases/answer-portfolio-question';
import { makeGetChatStatus } from '../application/use-cases/get-chat-status';
import {
  ANTHROPIC_DEFAULT_MAX_TOKENS,
  makeAnthropicChatModel,
} from '../infrastructure/ai/anthropic-chat-model';
import { makeAssetPortfolioCorpus } from '../infrastructure/ai/asset-portfolio-corpus';
import { makeDeepSeekBudget, unlimitedBudget } from '../infrastructure/ai/deepseek-budget';
import {
  DEEPSEEK_DEFAULT_MAX_TOKENS,
  makeDeepSeekChatModel,
} from '../infrastructure/ai/deepseek-chat-model';
import { fakeChatModel } from '../infrastructure/ai/fake-chat-model';
import { makeChatEndpoint } from '../infrastructure/http/chat-endpoint';
import { makeChatStatusEndpoint } from '../infrastructure/http/chat-status-endpoint';
import { makeCloudflareRateLimiter } from '../infrastructure/security/cloudflare-rate-limiter';
import { makeKvChatQuota, visitorKey } from '../infrastructure/security/kv-chat-quota';
import { makeTurnstileVerifier } from '../infrastructure/security/turnstile-verifier';

/**
 * Composition for "Ask me" (ADR 0017). CHAT_MODEL picks the provider: "deepseek" (the default in
 * production), "anthropic", or "fake" (free, for local runs, previews and tests). A real provider
 * is used only when the chat is enabled and its API key exists; otherwise the endpoint answers
 * "disabled". On DeepSeek a balance below CHAT_MIN_BALANCE_USD pauses the chat by itself.
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
        maxTokens: CHAT_MAX_TOKENS ?? DEEPSEEK_DEFAULT_MAX_TOKENS,
        contactEmail: CONTACT_EMAIL,
      })
    : CHAT_MODEL === 'anthropic'
      ? makeAnthropicChatModel({
          apiKey: ANTHROPIC_API_KEY ?? '',
          model: CHAT_MODEL_ID || 'claude-opus-5-5',
          effort: CHAT_EFFORT,
          maxTokens: CHAT_MAX_TOKENS ?? ANTHROPIC_DEFAULT_MAX_TOKENS,
          contactEmail: CONTACT_EMAIL,
        })
      : fakeChatModel;

const log = (entry: object) => {
  console.log(JSON.stringify(entry));
};

const enabled = CHAT_ENABLED && providerReady;

const budget =
  CHAT_MODEL === 'deepseek'
    ? makeDeepSeekBudget({
        apiKey: DEEPSEEK_API_KEY ?? '',
        minimumUsd: CHAT_MIN_BALANCE_USD,
        kv: env.CHAT_QUOTA,
        onError: (error) => {
          log({ event: 'chat.budget', outcome: 'unreadable', error: String(error) });
        },
      })
    : unlimitedBudget;

const rateLimiter = makeCloudflareRateLimiter(env.CHAT_RATE_LIMITER);
const visitorKeyFor = (ip: string) => visitorKey(ip, today(), CHAT_VISITOR_PEPPER ?? 'local');

const answer = makeAnswerPortfolioQuestion({
  enabled,
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
  budget,
  rateLimiter,
});

export const handleChatRequest = makeChatEndpoint({
  answer,
  visitorKeyFor,
  log,
  newId: () => crypto.randomUUID(),
  now: () => Date.now(),
});

export const handleChatStatusRequest = makeChatStatusEndpoint({
  getChatStatus: makeGetChatStatus({ enabled, budget }),
  rateLimiter,
  visitorKeyFor,
});
