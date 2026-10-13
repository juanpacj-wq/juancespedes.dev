import { describe, expect, it, vi } from 'vitest';

import type { ChatEvent, ChatModel, QuotaDecision } from '../../../src/application/ports/chat';
import {
  makeAnswerPortfolioQuestion,
  type AnswerQuestionDeps,
} from '../../../src/application/use-cases/answer-portfolio-question';

const events: ChatEvent[] = [
  { type: 'text', text: 'Sí, ' },
  {
    type: 'done',
    outcome: 'answered',
    usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 9000, cacheWriteTokens: 0 },
  },
];

const setup = (
  overrides: Partial<AnswerQuestionDeps> = {},
  decision: QuotaDecision = 'allowed',
) => {
  const answer = vi.fn<ChatModel['answer']>(async function* () {
    await Promise.resolve();
    yield* events;
  });
  const corpusGet = vi.fn(() => Promise.resolve('CORPUS'));
  const consume = vi.fn(() => Promise.resolve(decision));
  const verify = vi.fn(() => Promise.resolve(true));
  const allow = vi.fn(() => Promise.resolve(true));
  const deps: AnswerQuestionDeps = {
    enabled: true,
    model: { answer },
    corpus: { get: corpusGet },
    quota: { consume },
    verifier: { verify },
    rateLimiter: { allow },
    ...overrides,
  };
  return { answer, corpusGet, consume, verify, allow, run: makeAnswerPortfolioQuestion(deps) };
};

const input = {
  locale: 'es' as const,
  question: '¿Ha trabajado con Oracle?',
  history: [],
  humanToken: 'token',
  remoteIp: '203.0.113.7',
  visitorKey: 'abc',
};

const collect = async (stream: AsyncIterable<ChatEvent>) => {
  const all: ChatEvent[] = [];
  for await (const event of stream) all.push(event);
  return all;
};

describe('answerPortfolioQuestion', () => {
  it('streams the model answer with the corpus of the locale', async () => {
    const { run, answer, corpusGet, verify, allow } = setup();
    const result = await run(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await collect(result.value)).toEqual(events);
    expect(corpusGet).toHaveBeenCalledWith('es');
    expect(answer).toHaveBeenCalledWith({
      locale: 'es',
      corpus: 'CORPUS',
      history: [],
      question: '¿Ha trabajado con Oracle?',
    });
    expect(verify).toHaveBeenCalledWith('token', '203.0.113.7');
    expect(allow).toHaveBeenCalledWith('chat:abc');
  });

  it('does nothing at all when the kill switch is off', async () => {
    const { run, verify } = setup({ enabled: false });
    expect(await run(input)).toEqual({ ok: false, error: { kind: 'disabled' } });
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects an invalid question before any paid or remote check', async () => {
    const { run, allow } = setup();
    expect(await run({ ...input, question: 'x' })).toEqual({
      ok: false,
      error: { kind: 'invalid', issue: 'question-too-short' },
    });
    expect(allow).not.toHaveBeenCalled();
  });

  it('stops on the burst limit, then on a failed human check', async () => {
    const limited = setup({ rateLimiter: { allow: () => Promise.resolve(false) } });
    expect(await limited.run(input)).toEqual({ ok: false, error: { kind: 'rate-limited' } });

    const bot = setup({ verifier: { verify: () => Promise.resolve(false) } });
    expect(await bot.run(input)).toEqual({ ok: false, error: { kind: 'verification-failed' } });
    expect(bot.consume).not.toHaveBeenCalled();
  });

  it.each(['visitor-limit', 'daily-limit'] as const)(
    'stops on the %s quota without calling the model',
    async (decision) => {
      const { run, answer } = setup({}, decision);
      expect(await run(input)).toEqual({ ok: false, error: { kind: decision } });
      expect(answer).not.toHaveBeenCalled();
    },
  );
});
