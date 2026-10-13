import { describe, expect, it } from 'vitest';

import { costOf, gradeAnswer, type EvalCase } from '../../../evals/chat/grade';

const base: EvalCase = { id: 'x', locale: 'es', question: 'q' };

describe('chat evaluation grading', () => {
  it('passes an answer that links, mentions and avoids what it should', () => {
    const grade = gradeAnswer(
      { ...base, links: ['/proyectos/a'], anyOf: ['oracle'], noneOf: ['$'] },
      'Sí, trabajó con ORACLE. Mira /proyectos/a.',
      'answered',
    );
    expect(grade).toEqual({ passed: true, failures: [] });
  });

  it('reports every broken rule', () => {
    const grade = gradeAnswer(
      { ...base, links: ['/proyectos/a'], anyOf: ['oracle'], noneOf: ['$'], maxWords: 3 },
      'Cuesta $100 dólares por hora',
      'truncated',
      [/CADENA/u],
    );
    expect(grade.failures).toEqual([
      'outcome was truncated',
      'missing link /proyectos/a',
      'none of: oracle',
      'must not contain: $',
      'too long: 5 words',
    ]);
  });

  it('requires the exact off-topic sentence, ignoring accents and apostrophes', () => {
    expect(
      gradeAnswer(
        { ...base, locale: 'en', offTopic: true },
        "I can only answer questions about Juan's work. Ask me about his projects.",
        'answered',
      ).passed,
    ).toBe(true);
    expect(gradeAnswer({ ...base, offTopic: true }, 'Hace sol.', 'answered').passed).toBe(false);
  });

  it('flags internal names from the denylist', () => {
    const pattern = /\bCADENA\b/u;
    expect(gradeAnswer(base, 'El portal CADENA', 'answered', [pattern]).failures).toEqual([
      `internal name: ${pattern.source}`,
    ]);
  });

  it('prices DeepSeek usage, where cached input is almost free', () => {
    expect(
      costOf(
        { inputTokens: 60, outputTokens: 300, cacheReadTokens: 10_000, cacheWriteTokens: 0 },
        'deepseek',
      ),
    ).toBeCloseTo(0.000438, 9);
  });

  it('prices usage at the Opus 5.5 rates', () => {
    expect(
      costOf({ inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
    ).toBe(4);
    expect(
      costOf({ inputTokens: 100, outputTokens: 500, cacheReadTokens: 10_000, cacheWriteTokens: 0 }),
    ).toBeCloseTo(0.0124, 6);
  });
});
