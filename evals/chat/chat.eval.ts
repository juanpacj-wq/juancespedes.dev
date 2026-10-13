import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

import type { ChatUsage } from '../../src/application/ports/chat';
import {
  makeAnthropicChatModel,
  type ChatEffort,
} from '../../src/infrastructure/ai/anthropic-chat-model';
import { makeDeepSeekChatModel } from '../../src/infrastructure/ai/deepseek-chat-model';
import { costOf, gradeAnswer, type EvalCase, type Provider } from './grade';

/*
 * Runs the 30-question set against the real model with the production prompt and the corpus the
 * build generated (dist/client/chat-corpus). It spends money, so it only runs when a provider key
 * is set (DEEPSEEK_API_KEY, or ANTHROPIC_API_KEY): `pnpm eval:chat`. Thresholds (ADR 0017):
 *   - at least 27 of 30 cases pass;
 *   - average cost per question at most USD 0.005 on DeepSeek, 0.08 on Claude;
 *   - after the first question of each language, every request reads the corpus from the cache.
 */

const ROOT = process.cwd();
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? '';
/** DeepSeek when its key is present (the production default), otherwise Claude. */
const PROVIDER: Provider =
  process.env.CHAT_MODEL === 'anthropic' || DEEPSEEK_KEY === '' ? 'anthropic' : 'deepseek';
const API_KEY = PROVIDER === 'deepseek' ? DEEPSEEK_KEY : ANTHROPIC_KEY;
const PASS_THRESHOLD = 27;
const MAX_AVERAGE_COST: Readonly<Record<Provider, number>> = { deepseek: 0.005, anthropic: 0.08 };

const readDenylist = (): RegExp[] => {
  const file = join(ROOT, '.content-denylist');
  const source =
    process.env.CONTENT_DENYLIST ?? (existsSync(file) ? readFileSync(file, 'utf8') : '');
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((term) =>
      term.startsWith('re:')
        ? new RegExp(term.slice(3), 'u')
        : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu'),
    );
};

describe.skipIf(API_KEY === '')('"Ask me" evaluation set', () => {
  it(
    'answers well, within budget, reading the corpus from the cache',
    async () => {
      const cases = parseYaml(
        readFileSync(join(ROOT, 'evals', 'chat', 'cases.yaml'), 'utf8'),
      ) as EvalCase[];
      const corpus = {
        es: readFileSync(join(ROOT, 'dist', 'client', 'chat-corpus', 'es.txt'), 'utf8'),
        en: readFileSync(join(ROOT, 'dist', 'client', 'chat-corpus', 'en.txt'), 'utf8'),
      };
      const model =
        PROVIDER === 'deepseek'
          ? makeDeepSeekChatModel({
              apiKey: API_KEY,
              model: process.env.CHAT_MODEL_ID ?? 'deepseek-flash',
              maxTokens: Number(process.env.CHAT_MAX_TOKENS ?? '4000'),
              contactEmail: 'juanpablocespedesj@gmail.com',
            })
          : makeAnthropicChatModel({
              apiKey: API_KEY,
              model: process.env.CHAT_MODEL_ID ?? 'claude-opus-5-5',
              effort: (process.env.CHAT_EFFORT ?? 'high') as ChatEffort,
              maxTokens: Number(process.env.CHAT_MAX_TOKENS ?? '4000'),
              contactEmail: 'juanpablocespedesj@gmail.com',
            });
      const denylist = readDenylist();
      const seenLocale = new Set<string>();

      const results = [];
      for (const testCase of cases) {
        const started = Date.now();
        let answer = '';
        let outcome = 'failed';
        let usage: ChatUsage = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        };
        for await (const event of model.answer({
          locale: testCase.locale,
          corpus: corpus[testCase.locale],
          history: [],
          question: testCase.question,
        })) {
          if (event.type === 'text') answer += event.text;
          else {
            outcome = event.outcome;
            usage = event.usage;
          }
        }
        const grade = gradeAnswer(testCase, answer, outcome, denylist);
        const warm = seenLocale.has(testCase.locale);
        seenLocale.add(testCase.locale);
        results.push({
          id: testCase.id,
          locale: testCase.locale,
          question: testCase.question,
          answer,
          outcome,
          passed: grade.passed,
          failures: grade.failures,
          usage,
          cost: costOf(usage, PROVIDER),
          cacheHit: usage.cacheReadTokens > 0,
          expectedCacheHit: warm,
          seconds: (Date.now() - started) / 1000,
        });
        console.log(
          `${grade.passed ? 'PASS' : 'FAIL'} ${testCase.id} ($${costOf(usage, PROVIDER).toFixed(4)}, cache ${String(usage.cacheReadTokens)})${grade.passed ? '' : `: ${grade.failures.join('; ')}`}`,
        );
      }

      const passed = results.filter((r) => r.passed).length;
      const total = results.reduce((sum, r) => sum + r.cost, 0);
      const average = total / results.length;
      const cacheMisses = results.filter((r) => r.expectedCacheHit && !r.cacheHit).map((r) => r.id);
      const summary = {
        date: new Date().toISOString(),
        provider: PROVIDER,
        model:
          process.env.CHAT_MODEL_ID ??
          (PROVIDER === 'deepseek' ? 'deepseek-flash' : 'claude-opus-5-5'),
        passed,
        total: results.length,
        totalCostUsd: Number(total.toFixed(4)),
        averageCostUsd: Number(average.toFixed(4)),
        cacheMisses,
        results,
      };
      mkdirSync(join(ROOT, 'reports'), { recursive: true });
      writeFileSync(
        join(ROOT, 'reports', 'chat-eval.json'),
        `${JSON.stringify(summary, null, 2)}\n`,
      );
      console.log(
        `\n${String(passed)}/${String(results.length)} passed, total $${total.toFixed(4)}, average $${average.toFixed(4)} per question, cache misses: ${cacheMisses.join(', ') || 'none'}`,
      );

      expect(passed).toBeGreaterThanOrEqual(PASS_THRESHOLD);
      expect(average).toBeLessThanOrEqual(MAX_AVERAGE_COST[PROVIDER]);
      expect(cacheMisses).toEqual([]);
    },
    30 * 60 * 1000,
  );
});
