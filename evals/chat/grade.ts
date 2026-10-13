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

export type Provider = 'deepseek' | 'anthropic';

/**
 * USD per million tokens. Claude Opus 5.5: input, output, cache read, 5-minute cache write.
 * DeepSeek Flash (peak hours, October 2026, from aggregators; the run reports the real usage):
 * cache miss, output, cache hit; no separate cache write charge.
 */
export const PRICES: Readonly<
  Record<Provider, { input: number; output: number; cacheRead: number; cacheWrite: number }>
> = {
  anthropic: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  deepseek: { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite: 0 },
};

export const costOf = (
  usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
  },
  provider: Provider = 'anthropic',
): number => {
  const price = PRICES[provider];
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.cacheWrite) /
    1_000_000
  );
};
