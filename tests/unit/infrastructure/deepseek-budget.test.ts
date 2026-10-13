import { describe, expect, it, vi } from 'vitest';

import {
  BALANCE_CACHE_KEY,
  makeDeepSeekBudget,
  unlimitedBudget,
} from '../../../src/infrastructure/ai/deepseek-budget';
import { makeChatStatusEndpoint } from '../../../src/infrastructure/http/chat-status-endpoint';
import type { KvLike } from '../../../src/infrastructure/security/kv-chat-quota';

const memoryKv = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  const put = vi.fn<KvLike['put']>((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  });
  const kv: KvLike = { get: (key) => Promise.resolve(store.get(key) ?? null), put };
  return { kv, put, store };
};

const balance = (usd: string, available = true) =>
  Response.json({
    is_available: available,
    balance_infos: [
      { currency: 'CNY', total_balance: '99.00' },
      { currency: 'USD', total_balance: usd, granted_balance: '0.00', topped_up_balance: usd },
    ],
  });

const budget = (response: Response | Error, kv = memoryKv().kv) => {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const onError = vi.fn();
  return {
    fetchMock,
    onError,
    guard: makeDeepSeekBudget({
      apiKey: 'sk-test',
      minimumUsd: 0.5,
      kv,
      fetch: fetchMock,
      onError,
    }),
  };
};

describe('DeepSeek budget', () => {
  it('reads the USD balance with the key and caches it for ten minutes', async () => {
    const memory = memoryKv();
    const { guard, fetchMock } = budget(balance('1.98'), memory.kv);
    expect(await guard.hasFunds()).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.deepseek.com/user/balance');
    expect(init?.headers).toMatchObject({ authorization: 'Bearer sk-test' });
    expect(memory.put).toHaveBeenCalledWith(BALANCE_CACHE_KEY, '1.98', { expirationTtl: 600 });

    expect(await guard.hasFunds()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pauses below the minimum and resumes at it', async () => {
    expect(await budget(balance('0.49')).guard.hasFunds()).toBe(false);
    expect(await budget(balance('0.50')).guard.hasFunds()).toBe(true);
  });

  it('answers from the cache without calling DeepSeek', async () => {
    const { guard, fetchMock } = budget(
      balance('9.00'),
      memoryKv({ [BALANCE_CACHE_KEY]: '0.10' }).kv,
    );
    expect(await guard.hasFunds()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts an unavailable account, a missing USD entry or a bad amount as no funds', async () => {
    expect(await budget(balance('5.00', false)).guard.hasFunds()).toBe(false);
    const cnyOnly = Response.json({
      is_available: true,
      balance_infos: [{ currency: 'CNY', total_balance: '50.00' }],
    });
    expect(await budget(cnyOnly).guard.hasFunds()).toBe(false);
    expect(await budget(balance('n/a')).guard.hasFunds()).toBe(false);
  });

  it('fails closed and reports the error when the balance cannot be read', async () => {
    const httpError = budget(new Response('down', { status: 503 }));
    expect(await httpError.guard.hasFunds()).toBe(false);
    expect(httpError.onError).toHaveBeenCalledWith(expect.any(Error));

    const network = budget(new Error('offline'));
    expect(await network.guard.hasFunds()).toBe(false);

    const brokenKv: KvLike = {
      get: () => Promise.reject(new Error('kv down')),
      put: () => Promise.resolve(),
    };
    expect(await budget(balance('5.00'), brokenKv).guard.hasFunds()).toBe(false);
  });

  it('has an unlimited variant for providers without a prepaid balance', async () => {
    expect(await unlimitedBudget.hasFunds()).toBe(true);
  });
});

describe('chat status endpoint', () => {
  const endpoint = (allowed: boolean) => {
    const getChatStatus = vi.fn(() => Promise.resolve('paused' as const));
    const allow = vi.fn(() => Promise.resolve(allowed));
    const handler = makeChatStatusEndpoint({
      getChatStatus,
      rateLimiter: { allow },
      visitorKeyFor: (ip) => Promise.resolve(`hash-of-${ip}`),
    });
    return { handler, getChatStatus, allow };
  };
  const request = new Request('https://juancespedes.dev/api/chat-status', {
    headers: { 'cf-connecting-ip': '203.0.113.7' },
  });

  it('reports the status only, never cached', async () => {
    const { handler, allow } = endpoint(true);
    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ chat: 'paused' });
    expect(allow).toHaveBeenCalledWith('chat-status:hash-of-203.0.113.7');
  });

  it('answers 429 over the rate limit without reading the status', async () => {
    const { handler, getChatStatus } = endpoint(false);
    const response = await handler(new Request('https://juancespedes.dev/api/chat-status'));
    expect(response.status).toBe(429);
    expect(getChatStatus).not.toHaveBeenCalled();
  });
});
