import { describe, expect, it, vi } from 'vitest';

import type { ChatEvent } from '../../../src/application/ports/chat';
import { chatInstructions } from '../../../src/infrastructure/ai/chat-instructions';
import { makeDeepSeekChatModel } from '../../../src/infrastructure/ai/deepseek-chat-model';

const sse = (chunks: readonly unknown[], splitAt = 7) => {
  const text = `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('')}data: [DONE]\n\n`;
  // Deliver the stream in uneven pieces, as the network does, so line buffering is exercised.
  const pieces: string[] = [];
  for (let index = 0; index < text.length; index += splitAt)
    pieces.push(text.slice(index, index + splitAt));
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const piece of pieces) controller.enqueue(new TextEncoder().encode(piece));
        controller.close();
      },
    }),
  );
};

const delta = (content: string) => ({ choices: [{ delta: { content }, finish_reason: null }] });
const finish = (reason: string) => ({
  choices: [{ delta: { content: '' }, finish_reason: reason }],
  usage: { completion_tokens: 42, prompt_cache_hit_tokens: 9900, prompt_cache_miss_tokens: 60 },
});

const collect = async (stream: AsyncIterable<ChatEvent>) => {
  const all: ChatEvent[] = [];
  for await (const event of stream) all.push(event);
  return all;
};

const request = {
  locale: 'es' as const,
  corpus: 'CORPUS',
  history: [
    { role: 'user' as const, text: 'Hola' },
    { role: 'assistant' as const, text: 'Hola.' },
  ],
  question: '¿Oracle?',
};

const model = (response: Response) => {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response));
  return {
    fetchMock,
    chat: makeDeepSeekChatModel({
      apiKey: 'sk-test',
      model: 'deepseek-flash',
      maxTokens: 800,
      contactEmail: 'me@example.com',
      fetch: fetchMock,
    }),
  };
};

describe('DeepSeek chat model', () => {
  it('streams the answer text and reports cache usage', async () => {
    const { chat, fetchMock } = model(
      sse([delta('Sí, '), delta('mira /proyectos/x.'), finish('stop')]),
    );
    expect(await collect(chat.answer(request))).toEqual([
      { type: 'text', text: 'Sí, ' },
      { type: 'text', text: 'mira /proyectos/x.' },
      {
        type: 'done',
        outcome: 'answered',
        usage: { inputTokens: 60, outputTokens: 42, cacheReadTokens: 9900, cacheWriteTokens: 0 },
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init?.headers).toMatchObject({ authorization: 'Bearer sk-test' });
    expect(JSON.parse(init?.body as string)).toEqual({
      model: 'deepseek-flash',
      max_tokens: 800,
      stream: true,
      stream_options: { include_usage: true },
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: `${chatInstructions('es', 'me@example.com')}\n\nCORPUS` },
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Hola.' },
        { role: 'user', content: '¿Oracle?' },
      ],
    });
  });

  it.each([
    ['length', 'truncated'],
    ['content_filter', 'refused'],
  ])('maps finish reason %s to %s', async (reason, outcome) => {
    const events = await collect(
      model(sse([delta('Parcial'), finish(reason)])).chat.answer(request),
    );
    expect(events.at(-1)).toMatchObject({ type: 'done', outcome });
  });

  it('fails on an HTTP error and on an abnormal or missing end', async () => {
    await expect(
      collect(model(new Response('busy', { status: 503 })).chat.answer(request)),
    ).rejects.toThrow('HTTP 503');
    await expect(
      collect(
        model(sse([delta('x'), finish('insufficient_system_resource')])).chat.answer(request),
      ),
    ).rejects.toThrow('insufficient_system_resource');
    await expect(collect(model(sse([delta('x')])).chat.answer(request))).rejects.toThrow(
      'no finish reason',
    );
  });

  it('ignores keep-alive comments and chunks without choices or usage', async () => {
    const response = new Response(
      `: keep-alive\n\ndata: ${JSON.stringify({})}\n\ndata: ${JSON.stringify(delta('ok'))}\n\ndata: ${JSON.stringify({ choices: [{ finish_reason: 'stop' }], usage: {} })}\n\ndata: [DONE]\n\n`,
    );
    expect(await collect(model(response).chat.answer(request))).toEqual([
      { type: 'text', text: 'ok' },
      {
        type: 'done',
        outcome: 'answered',
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      },
    ]);
  });
});
