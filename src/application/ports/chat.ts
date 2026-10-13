import type { ChatTurn } from '../../domain/chat/question';
import type { Locale } from '../../domain/shared/locale';

/** What the model streams back: text as it is written, then how it ended. */
export type ChatEvent =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'done';
      /** `refused`: the model's safety system declined, even after the server-side fallback. */
      readonly outcome: 'answered' | 'truncated' | 'refused';
      readonly usage: ChatUsage;
    };

export interface ChatUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

export interface ChatModelRequest {
  readonly locale: Locale;
  /** The published portfolio as text; stable between requests so it can be cached. */
  readonly corpus: string;
  readonly history: readonly ChatTurn[];
  readonly question: string;
}

export interface ChatModel {
  answer(request: ChatModelRequest): AsyncIterable<ChatEvent>;
}

export interface PortfolioCorpus {
  get(locale: Locale): Promise<string>;
}

export type QuotaDecision = 'allowed' | 'visitor-limit' | 'daily-limit';

/** Questions per visitor and in total, per day. The visitor key is already anonymized. */
export interface ChatQuota {
  consume(visitorKey: string): Promise<QuotaDecision>;
}
