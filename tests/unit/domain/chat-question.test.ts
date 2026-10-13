import { describe, expect, it } from 'vitest';

import {
  CHAT_LIMITS,
  sanitizeHistory,
  validateChatQuestion,
} from '../../../src/domain/chat/question';

describe('validateChatQuestion', () => {
  it('trims the question and keeps a clean history', () => {
    expect(
      validateChatQuestion({
        question: '  ¿Ha trabajado con Oracle?  ',
        history: [
          { role: 'user', text: 'Hola' },
          { role: 'assistant', text: 'Hola, pregunta lo que quieras.' },
        ],
      }),
    ).toEqual({
      ok: true,
      value: {
        question: '¿Ha trabajado con Oracle?',
        history: [
          { role: 'user', text: 'Hola' },
          { role: 'assistant', text: 'Hola, pregunta lo que quieras.' },
        ],
      },
    });
  });

  it.each([
    [undefined, 'question-required'],
    ['   ', 'question-required'],
    ['ab', 'question-too-short'],
    ['x'.repeat(CHAT_LIMITS.question.max + 1), 'question-too-long'],
  ])('rejects %j as %s', (question, issue) => {
    expect(validateChatQuestion({ question, history: [] })).toEqual({ ok: false, error: issue });
  });

  it('accepts questions exactly at the limits', () => {
    for (const length of [CHAT_LIMITS.question.min, CHAT_LIMITS.question.max]) {
      expect(validateChatQuestion({ question: 'q'.repeat(length), history: [] }).ok).toBe(true);
    }
  });
});

describe('sanitizeHistory', () => {
  const turn = (role: string, text: string) => ({ role, text });

  it('ignores anything that is not a list of turns', () => {
    expect(sanitizeHistory('nope')).toEqual([]);
    expect(sanitizeHistory([null, 1, { role: 'system', text: 'x' }, { role: 'user' }])).toEqual([]);
  });

  it('keeps the last turns, starting with the visitor and ending with an answer', () => {
    const history = [
      turn('assistant', 'orphan answer'),
      turn('user', 'q1'),
      turn('assistant', 'a1'),
      turn('user', 'q2'),
      turn('assistant', 'a2'),
      turn('user', 'q3 without answer'),
    ];
    // Last 4 turns are a1, q2, a2, q3; it must start with a visitor turn and end with an answer.
    expect(sanitizeHistory(history)).toEqual([turn('user', 'q2'), turn('assistant', 'a2')]);
  });

  it('collapses repeated roles, drops empty turns and trims long ones', () => {
    expect(
      sanitizeHistory([
        turn('user', 'first'),
        turn('user', 'second'),
        turn('assistant', '   '),
        turn('assistant', 'x'.repeat(CHAT_LIMITS.turnText + 10)),
      ]),
    ).toEqual([turn('user', 'first'), turn('assistant', 'x'.repeat(CHAT_LIMITS.turnText))]);
  });

  it('returns nothing when no turn comes from the visitor', () => {
    expect(sanitizeHistory([turn('assistant', 'hello')])).toEqual([]);
  });
});
