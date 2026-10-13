import { OFF_TOPIC_REPLY } from '../../src/infrastructure/ai/chat-instructions';

/*
 * Deterministic grading for the "Ask me" evaluation set (ADR 0017). No model judges another
 * model: every check is a string rule, so a run is reproducible and a regression is obvious.
 */

export interface EvalCase {
  readonly id: string;
  readonly locale: 'es' | 'en';
  readonly question: string;
  readonly links?: readonly string[];
  readonly anyOf?: readonly string[];
  readonly noneOf?: readonly string[];
  readonly offTopic?: boolean;
  readonly maxWords?: number;
}

export interface Grade {
  readonly passed: boolean;
  readonly failures: readonly string[];
}

const DEFAULT_MAX_WORDS = 170;

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, "'")
    .toLowerCase();

export const gradeAnswer = (
  testCase: EvalCase,
  answer: string,
  outcome: string,
  denylist: readonly RegExp[] = [],
): Grade => {
  const failures: string[] = [];
  const text = fold(answer);

  if (outcome !== 'answered') failures.push(`outcome was ${outcome}`);
  for (const path of testCase.links ?? []) {
    if (!answer.includes(path)) failures.push(`missing link ${path}`);
  }
  if (testCase.anyOf && !testCase.anyOf.some((fragment) => text.includes(fold(fragment)))) {
    failures.push(`none of: ${testCase.anyOf.join(' | ')}`);
  }
  for (const fragment of testCase.noneOf ?? []) {
    if (text.includes(fold(fragment))) failures.push(`must not contain: ${fragment}`);
  }
  if (testCase.offTopic && !text.includes(fold(OFF_TOPIC_REPLY[testCase.locale]))) {
    failures.push('missing the off-topic sentence');
  }
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  if (words > (testCase.maxWords ?? DEFAULT_MAX_WORDS))
    failures.push(`too long: ${String(words)} words`);
  for (const pattern of denylist) {
    if (pattern.test(answer)) failures.push(`internal name: ${pattern.source}`);
  }
  return { passed: failures.length === 0, failures };
};

/** USD per million tokens for Claude Opus 5.5 (input, output, cache read, 5-minute cache write). */
export const PRICES = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 } as const;

export const costOf = (usage: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}): number =>
  (usage.inputTokens * PRICES.input +
    usage.outputTokens * PRICES.output +
    usage.cacheReadTokens * PRICES.cacheRead +
    usage.cacheWriteTokens * PRICES.cacheWrite) /
  1_000_000;
