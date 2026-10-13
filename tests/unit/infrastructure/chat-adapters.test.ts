import { describe, expect, it, vi } from 'vitest';

import type { ChatEvent } from '../../../src/application/ports/chat';
import type { AnswerPortfolioQuestion } from '../../../src/application/use-cases/answer-portfolio-question';
import { err, ok } from '../../../src/domain/shared/result';
import { makeAnthropicChatModel } from '../../../src/infrastructure/ai/anthropic-chat-model';
import { makeAssetPortfolioCorpus } from '../../../src/infrastructure/ai/asset-portfolio-corpus';
import {
  chatInstructions,
  OFF_TOPIC_REPLY,
} from '../../../src/infrastructure/ai/chat-instructions';
import { fakeChatModel } from '../../../src/infrastructure/ai/fake-chat-model';
import {
  makeChatEndpoint,
  type ChatLogEntry,
} from '../../../src/infrastructure/http/chat-endpoint';
import {
  makeKvChatQuota,
  visitorKey,
  type KvLike,
} from '../../../src/infrastructure/security/kv-chat-quota';

const collect = async (stream: AsyncIterable<ChatEvent>) => {
  const all: ChatEvent[] = [];
  for await (const event of stream) all.push(event);
  return all;
};

const request = { locale: 'en' as const, corpus: 'CORPUS', history: [], question: 'Oracle?' };

describe('Anthropic chat model', () => {
  const fakeClient = (stopReason: string) => {
    const stream = vi.fn(() => {
      const events = [
        { type: 'content_block_start', content_block: { type: 'thinking' } },
        { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'hidden' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Yes, ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'see /en/projects/x.' } },
      ];
      return {
        async *[Symbol.asyncIterator]() {
          await Promise.resolve();
          yield* events;
        },
        finalMessage: () =>
          Promise.resolve({
            stop_reason: stopReason,
            usage: {
              input_tokens: 40,
              output_tokens: 300,
              cache_read_input_tokens: 9800,
              cache_creation_input_tokens: null,
            },
          }),
      };
    });
    return { client: { beta: { messages: { stream } } }, stream };
  };

  const model = (stopReason: string) => {
    const { client, stream } = fakeClient(stopReason);
    return {
      stream,
      chat: makeAnthropicChatModel({
        apiKey: 'test',
        model: 'claude-opus-5-5',
        effort: 'high',
        maxTokens: 4000,
        contactEmail: 'me@example.com',
        client: client as never,
      }),
    };
  };

  it('streams only the visible text and reports usage', async () => {
    const { chat, stream } = model('end_turn');
    expect(
      await collect(
        chat.answer({
          ...request,
          history: [
            { role: 'user', text: 'Hi' },
            { role: 'assistant', text: 'Hello' },
          ],
        }),
      ),
    ).toEqual([
      { type: 'text', text: 'Yes, ' },
      { type: 'text', text: 'see /en/projects/x.' },
      {
        type: 'done',
        outcome: 'answered',
        usage: { inputTokens: 40, outputTokens: 300, cacheReadTokens: 9800, cacheWriteTokens: 0 },
      },
    ]);
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'high' },
        system: [
          { type: 'text', text: chatInstructions('en', 'me@example.com') },
          { type: 'text', text: 'CORPUS', cache_control: { type: 'ephemeral' } },
        ],
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'Oracle?' },
        ],
      }),
    );
  });

  it.each([
    ['refusal', 'refused'],
    ['max_tokens', 'truncated'],
  ])('maps stop reason %s to %s', async (stopReason, outcome) => {
    const events = await collect(model(stopReason).chat.answer(request));
    expect(events.at(-1)).toMatchObject({ type: 'done', outcome });
  });
});

describe('chat instructions', () => {
  it('fill in the email and carry the exact off-topic sentence', () => {
    for (const locale of ['es', 'en'] as const) {
      const text = chatInstructions(locale, 'me@example.com');
      expect(text).toContain('me@example.com');
      expect(text).not.toContain('{EMAIL}');
      expect(text).toContain(OFF_TOPIC_REPLY[locale]);
    }
  });
});

describe('fake chat model', () => {
  it('answers in the locale and points at the first project of the corpus', async () => {
    const events = await collect(
      fakeChatModel.answer({ ...request, locale: 'es', corpus: 'Página: /proyectos/a\n' }),
    );
    const text = events.flatMap((e) => (e.type === 'text' ? [e.text] : [])).join('');
    expect(text).toContain('/proyectos/a');
    expect(events.at(-1)).toMatchObject({ type: 'done', outcome: 'answered' });
    const english = await collect(fakeChatModel.answer({ ...request, corpus: 'nothing' }));
    expect(english.flatMap((e) => (e.type === 'text' ? [e.text] : [])).join('')).toContain(
      'Test answer',
    );
  });
});

describe('asset corpus', () => {
  it('fetches each locale once and retries after a failure', async () => {
    const fetchAsset = vi
      .fn<(path: string) => Promise<Response>>()
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValue(new Response('CORPUS ES'));
    const corpus = makeAssetPortfolioCorpus(fetchAsset);
    await expect(corpus.get('es')).rejects.toThrow('HTTP 500');
    await Promise.resolve();
    expect(await corpus.get('es')).toBe('CORPUS ES');
    expect(await corpus.get('es')).toBe('CORPUS ES');
    expect(fetchAsset).toHaveBeenCalledTimes(2);
    expect(fetchAsset).toHaveBeenLastCalledWith('/chat-corpus/es.txt');
  });
});

describe('KV chat quota', () => {
  const memory = (): KvLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      get: (key) => Promise.resolve(data.get(key) ?? null),
      put: (key, value) => {
        data.set(key, value);
        return Promise.resolve();
      },
    };
  };

  it('counts per visitor and per day, and stops at each limit', async () => {
    const kv = memory();
    const quota = makeKvChatQuota({ kv, perVisitor: 2, perDay: 3, today: () => '2026-10-12' });
    expect(await quota.consume('a')).toBe('allowed');
    expect(await quota.consume('a')).toBe('allowed');
    expect(await quota.consume('a')).toBe('visitor-limit');
    expect(await quota.consume('b')).toBe('allowed');
    expect(await quota.consume('c')).toBe('daily-limit');
    expect(kv.data.get('chat:day:2026-10-12')).toBe('3');
  });

  it('denies when the store fails, because it protects spending', async () => {
    const quota = makeKvChatQuota({
      kv: { get: () => Promise.reject(new Error('down')), put: () => Promise.resolve() },
      perVisitor: 5,
      perDay: 5,
      today: () => '2026-10-12',
    });
    expect(await quota.consume('a')).toBe('daily-limit');
  });

  it('derives a short, daily-rotating id that does not contain the IP', async () => {
    const one = await visitorKey('203.0.113.7', '2026-10-12', 'pepper');
    expect(one).toMatch(/^[0-9a-f]{32}$/);
    expect(one).not.toContain('203');
    expect(await visitorKey('203.0.113.7', '2026-10-12', 'pepper')).toBe(one);
    expect(await visitorKey('203.0.113.7', '2026-10-13', 'pepper')).not.toBe(one);
    expect(await visitorKey('203.0.113.7', '2026-10-12', 'other')).not.toBe(one);
  });
});

describe('chat endpoint', () => {
  const ORIGIN = 'https://juancespedes.dev';
  const post = (body: string, type = 'application/json') =>
    new Request(`${ORIGIN}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': type, 'cf-connecting-ip': '203.0.113.7' },
      body,
    });

  const setup = (answer: AnswerPortfolioQuestion) => {
    const log = vi.fn<(entry: ChatLogEntry) => void>();
    const handle = makeChatEndpoint({
      answer,
      visitorKeyFor: (ip) => Promise.resolve(`key-${ip}`),
      log,
      newId: () => 'req-1',
      now: () => 0,
    });
    return { handle, log };
  };

  const streamOf = (events: ChatEvent[]) =>
    (async function* () {
      await Promise.resolve();
      yield* events;
    })();

  it('streams newline-delimited JSON and logs usage, not content', async () => {
    const answer = vi.fn<AnswerPortfolioQuestion>(() =>
      Promise.resolve(
        ok(
          streamOf([
            { type: 'text', text: 'Hola' },
            {
              type: 'done',
              outcome: 'answered',
              usage: { inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 0 },
            },
          ]),
        ),
      ),
    );
    const { handle, log } = setup(answer);
    const response = await handle(
      post(JSON.stringify({ question: 'q?', history: [], locale: 'en', token: 't' })),
    );
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    expect(
      (await response.text())
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as unknown),
    ).toEqual([
      { type: 'text', text: 'Hola' },
      { type: 'done', outcome: 'answered' },
    ]);
    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', humanToken: 't', visitorKey: 'key-203.0.113.7' }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'answered', usage: expect.any(Object) as unknown }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('Hola');
  });

  it('turns a failure in the middle of the answer into an error line', async () => {
    const failing = (async function* (): AsyncIterable<ChatEvent> {
      await Promise.resolve();
      yield { type: 'text', text: 'Par' };
      throw new Error('upstream');
    })();
    const { handle, log } = setup(() => Promise.resolve(ok(failing)));
    const response = await handle(post(JSON.stringify({ question: 'q?', locale: 'es' })));
    expect(await response.text()).toContain('{"type":"error"}');
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'failed' }));
  });

  it('answers problem details with a code the interface translates', async () => {
    const { handle } = setup(() =>
      Promise.resolve(err({ kind: 'invalid', issue: 'question-too-short' } as const)),
    );
    const response = await handle(post(JSON.stringify({ question: 'x', locale: 'xx' })));
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(await response.json()).toMatchObject({
      code: 'invalid',
      detail: 'question-too-short',
      requestId: 'req-1',
    });

    const limited = setup(() => Promise.resolve(err({ kind: 'daily-limit' } as const)));
    expect((await limited.handle(post('{}'))).status).toBe(429);
  });

  it('rejects other content types, oversized bodies and survives malformed JSON', async () => {
    const answer = vi.fn<AnswerPortfolioQuestion>(() =>
      Promise.resolve(err({ kind: 'invalid', issue: 'question-required' } as const)),
    );
    const { handle } = setup(answer);
    expect((await handle(post('q', 'text/plain'))).status).toBe(415);
    expect((await handle(post('x'.repeat(20_000)))).status).toBe(413);
    expect((await handle(post('{not json'))).status).toBe(400);
    expect((await handle(post('"just a string"'))).status).toBe(400);
    expect(answer).toHaveBeenLastCalledWith(
      expect.objectContaining({ locale: 'es', humanToken: '' }),
    );
  });
});
