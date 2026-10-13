import { validateChatQuestion, type ChatQuestionIssue } from '../../domain/chat/question';
import type { Locale } from '../../domain/shared/locale';
import { err, ok, type Result } from '../../domain/shared/result';
import type { ChatEvent, ChatModel, ChatQuota, PortfolioCorpus } from '../ports/chat';
import type { HumanVerifier, RateLimiter } from '../ports/contact';

export interface AnswerQuestionInput {
  readonly locale: Locale;
  readonly question: unknown;
  readonly history: unknown;
  readonly humanToken: string;
  readonly remoteIp: string | null;
  /** Anonymized visitor id (a salted hash), never the raw IP. */
  readonly visitorKey: string;
}

export type AnswerQuestionError =
  | { readonly kind: 'disabled' }
  | { readonly kind: 'invalid'; readonly issue: ChatQuestionIssue }
  | { readonly kind: 'rate-limited' }
  | { readonly kind: 'verification-failed' }
  | { readonly kind: 'visitor-limit' }
  | { readonly kind: 'daily-limit' };

export interface AnswerQuestionDeps {
  /** The kill switch: false answers "disabled" before anything else runs or costs money. */
  readonly enabled: boolean;
  readonly model: ChatModel;
  readonly corpus: PortfolioCorpus;
  readonly quota: ChatQuota;
  readonly verifier: HumanVerifier;
  /** Short-window burst limit (per minute); the quota covers the day. */
  readonly rateLimiter: RateLimiter;
}

/**
 * "Ask me": answers a question about the published work. Checks run cheapest first and the
 * model, the only paid step, runs last. Nothing about the conversation is stored.
 */
export const makeAnswerPortfolioQuestion =
  ({ enabled, model, corpus, quota, verifier, rateLimiter }: AnswerQuestionDeps) =>
  async (
    input: AnswerQuestionInput,
  ): Promise<Result<AsyncIterable<ChatEvent>, AnswerQuestionError>> => {
    if (!enabled) return err({ kind: 'disabled' });

    const question = validateChatQuestion(input);
    if (!question.ok) return err({ kind: 'invalid', issue: question.error });

    if (!(await rateLimiter.allow(`chat:${input.visitorKey}`)))
      return err({ kind: 'rate-limited' });
    if (!(await verifier.verify(input.humanToken, input.remoteIp))) {
      return err({ kind: 'verification-failed' });
    }

    const decision = await quota.consume(input.visitorKey);
    if (decision !== 'allowed') return err({ kind: decision });

    return ok(
      model.answer({
        locale: input.locale,
        corpus: await corpus.get(input.locale),
        history: question.value.history,
        question: question.value.question,
      }),
    );
  };

export type AnswerPortfolioQuestion = ReturnType<typeof makeAnswerPortfolioQuestion>;
