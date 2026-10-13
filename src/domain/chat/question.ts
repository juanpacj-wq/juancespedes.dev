import { err, ok, type Result } from '../shared/result';

/*
 * A question for the "Ask me" chat (ADR 0017). The chat answers about the owner's published work
 * only; these rules keep each request small, which is also what keeps its cost bounded: a short
 * question, a short history, nothing else from the visitor.
 */

export const CHAT_LIMITS = {
  question: { min: 3, max: 500 },
  /** Earlier turns sent back for follow-up questions; older ones are dropped. */
  historyTurns: 4,
  turnText: 1500,
} as const;

export interface ChatTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export interface ChatQuestion {
  readonly question: string;
  readonly history: readonly ChatTurn[];
}

export type ChatQuestionIssue = 'question-required' | 'question-too-short' | 'question-too-long';

const isTurn = (value: unknown): value is ChatTurn => {
  if (typeof value !== 'object' || value === null) return false;
  const turn = value as Partial<Record<keyof ChatTurn, unknown>>;
  return (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string';
};

/**
 * Keeps the last turns that alternate correctly, starting with the visitor, each trimmed to the
 * limit. Anything malformed is dropped rather than rejected: history is a convenience.
 */
export const sanitizeHistory = (history: unknown): readonly ChatTurn[] => {
  if (!Array.isArray(history)) return [];
  const turns = history
    .filter(isTurn)
    .map((turn) => ({ role: turn.role, text: turn.text.trim().slice(0, CHAT_LIMITS.turnText) }))
    .filter((turn) => turn.text !== '')
    .slice(-CHAT_LIMITS.historyTurns);
  const firstUser = turns.findIndex((turn) => turn.role === 'user');
  if (firstUser === -1) return [];
  const alternating: ChatTurn[] = [];
  for (const turn of turns.slice(firstUser)) {
    if (alternating.at(-1)?.role !== turn.role) alternating.push(turn);
  }
  // The new question is the next user turn, so the history must end with an answer.
  return alternating.at(-1)?.role === 'assistant' ? alternating : alternating.slice(0, -1);
};

export const validateChatQuestion = (input: {
  readonly question: unknown;
  readonly history: unknown;
}): Result<ChatQuestion, ChatQuestionIssue> => {
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  if (question === '') return err('question-required');
  if (question.length < CHAT_LIMITS.question.min) return err('question-too-short');
  if (question.length > CHAT_LIMITS.question.max) return err('question-too-long');
  return ok({ question, history: sanitizeHistory(input.history) });
};
