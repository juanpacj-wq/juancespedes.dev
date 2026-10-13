// @ts-check
/**
 * Mutation testing for the domain (ADR 0014). Stryker changes the code in small ways (flips a
 * comparison, removes a condition) and expects the unit tests to fail for each change. A
 * mutant that survives is a rule the tests do not really pin down.
 *
 * The command runner starts a fresh Vitest process per mutant. The Vitest plugin
 * (@stryker-mutator/vitest-runner 10) reuses cached modules under Vitest 5 and never activates
 * the mutants (obvious ones such as `if (false)` in the sort order "survived"), so it is not used.
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  testRunner: 'command',
  commandRunner: {
    command: 'pnpm exec vitest run tests/unit/domain tests/unit/application --reporter=dot',
  },
  mutate: ['src/domain/**/*.ts'],
  coverageAnalysis: 'off',
  concurrency: 4,
  timeoutMS: 30000,
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  thresholds: { high: 90, low: 80, break: 80 },
  tempDirName: '.stryker-tmp',
};
