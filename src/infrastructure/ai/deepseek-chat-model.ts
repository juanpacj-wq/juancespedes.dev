import type { ChatEvent, ChatModel, ChatModelRequest } from '../../application/ports/chat';
import { chatInstructions } from './chat-instructions';

/*
 * "Ask me" on the DeepSeek API (ADR 0017), the default provider: it costs a fraction of a cent per
 * question. The API is OpenAI-compatible, so this is plain fetch and server-sent events, no SDK.
 * - One system message, instructions then corpus: the prefix is identical on every request, which
 *   is what DeepSeek's automatic context cache matches.
 * - Thinking is off: the answer comes from the given text and must be short, so reasoning would
 *   only add cost and latency.
 * - `finish_reason: "content_filter"` is reported as a refusal; other abnormal ends as errors.
 */

export interface DeepSeekChatModelOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly contactEmail: string;
  /** Injected for tests; defaults to the global fetch. */
  readonly fetch?: typeof fetch;
  readonly endpoint?: string;
}

interface StreamChunk {
  readonly choices?: readonly {
    readonly delta?: { readonly content?: string | null };
    readonly finish_reason?: string | null;
  }[];
  readonly usage?: {
    readonly completion_tokens?: number;
    readonly prompt_cache_hit_tokens?: number;
    readonly prompt_cache_miss_tokens?: number;
  } | null;
}

const OUTCOME: Readonly<Record<string, 'answered' | 'truncated' | 'refused'>> = {
  stop: 'answered',
  length: 'truncated',
  content_filter: 'refused',
};

export const makeDeepSeekChatModel = ({
  apiKey,
  model,
  maxTokens,
  contactEmail,
  fetch: fetchImpl = fetch,
  endpoint = 'https://api.deepseek.com/chat/completions',
}: DeepSeekChatModelOptions): ChatModel => ({
  async *answer({ locale, corpus, history, question }: ChatModelRequest): AsyncIterable<ChatEvent> {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: `${chatInstructions(locale, contactEmail)}\n\n${corpus}` },
          ...history.map((turn) => ({ role: turn.role, content: turn.text })),
          { role: 'user', content: question },
        ],
      }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`DeepSeek API answered HTTP ${String(response.status)}`);
    }

    let finish: string | null = null;
    let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    let buffer = '';
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const data = line.startsWith('data:') ? line.slice(5).trim() : '';
        if (data === '' || data === '[DONE]') continue;
        const chunk = JSON.parse(data) as StreamChunk;
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content;
        if (text) yield { type: 'text', text };
        if (choice?.finish_reason) finish = choice.finish_reason;
        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.prompt_cache_miss_tokens ?? 0,
            outputTokens: chunk.usage.completion_tokens ?? 0,
            cacheReadTokens: chunk.usage.prompt_cache_hit_tokens ?? 0,
            // DeepSeek bills cache writes as ordinary input; there is no separate write charge.
            cacheWriteTokens: 0,
          };
        }
      }
    }

    const outcome = finish === null ? undefined : OUTCOME[finish];
    if (!outcome) throw new Error(`DeepSeek stream ended with ${finish ?? 'no finish reason'}`);
    yield { type: 'done', outcome, usage };
  },
});
