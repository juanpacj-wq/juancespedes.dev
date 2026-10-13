import { defineConfig } from 'vitest/config';

/**
 * The paid evaluation of "Ask me" (ADR 0017), separate from the unit suite: `pnpm eval:chat`.
 * Sequential on purpose, so the prompt cache is warm after the first question of each language.
 */
export default defineConfig({
  test: {
    include: ['evals/**/*.eval.ts'],
    fileParallelism: false,
    testTimeout: 30 * 60 * 1000,
  },
});
