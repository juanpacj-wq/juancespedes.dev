import Anthropic from '@anthropic-ai/sdk';

import type {
  ChatEvent,
  ChatModel,
  ChatModelRequest,
  ChatUsage,
} from '../../application/ports/chat';
import { chatInstructions } from './chat-instructions';

/*
 * The "Ask me" model adapter on the Claude API (ADR 0017).
 * - System prompt: instructions, then the portfolio corpus marked for prompt caching. Both are
 *   stable per language, so after the first question each request pays almost only for itself.
 * - Claude Opus 5.5 always thinks; depth is set with `output_config.effort`.
 * - Server-side fallback (`fallbacks: "default"`) re-runs a request the model's safety system
 *   declines; a final `stop_reason: "refusal"` means the whole chain declined.
 * Only type imports from the application layer, so the evaluation script can load it in Node.
 */

export type ChatEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicChatModelOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly effort: ChatEffort;
  /** Thinking counts toward this too; the instructions keep the visible answer short. */
  readonly maxTokens: number;
  readonly contactEmail: string;
  /** Injected for tests; defaults to the SDK client. */
  readonly client?: Pick<Anthropic, 'beta'>;
}

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export const makeAnthropicChatModel = ({
  apiKey,
  model,
  effort,
  maxTokens,
  contactEmail,
  client = new Anthropic({ apiKey, maxRetries: 1 }),
}: AnthropicChatModelOptions): ChatModel => ({
  async *answer({ locale, corpus, history, question }: ChatModelRequest): AsyncIterable<ChatEvent> {
    const stream = client.beta.messages.stream({
      model,
      max_tokens: maxTokens,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort },
      system: [
        { type: 'text', text: chatInstructions(locale, contactEmail) },
        { type: 'text', text: corpus, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        ...history.map((turn) => ({ role: turn.role, content: turn.text })),
        { role: 'user' as const, content: question },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', text: event.delta.text };
      }
    }

    const message = await stream.finalMessage();
    const usage: ChatUsage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
    };
    const outcome =
      message.stop_reason === 'refusal'
        ? 'refused'
        : message.stop_reason === 'max_tokens'
          ? 'truncated'
          : 'answered';
    yield { type: 'done', outcome, usage };
  },
});
