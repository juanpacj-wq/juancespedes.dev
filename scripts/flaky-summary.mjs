#!/usr/bin/env node
// Lists the end-to-end tests that passed only on a retry, so CI's retries do not hide them: a
// warning annotation on the run and a line in the job summary for each one. It never fails the
// job; the point is that a flaky test is seen and fixed (docs/runbooks/deploy-friction.md).
//
// Usage, after `pnpm test:e2e` in CI: node scripts/flaky-summary.mjs [playwright-report/results.json]
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'playwright-report/results.json';
if (!existsSync(file)) {
  console.log(`No report at ${file}: nothing to summarize.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
/** @type {{ title: string, project: string, file: string, line: number, tries: number }[]} */
const flaky = [];
/**
 * @param {any} suite A suite of Playwright's JSON report.
 * @param {string[]} titles
 */
const walk = (suite, titles) => {
  for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.status === 'flaky') {
        flaky.push({
          title: [...titles, spec.title].filter(Boolean).join(' › '),
          project: test.projectName,
          file: spec.file,
          line: spec.line,
          tries: (test.results ?? []).length,
        });
      }
    }
  }
};
for (const suite of report.suites ?? []) walk(suite, []);

const lines =
  flaky.length === 0
    ? ['No flaky tests.']
    : flaky.map(
        (test) => `- [${test.project}] ${test.title} (passed on try ${String(test.tries)})`,
      );
console.log(lines.join('\n'));
for (const test of flaky) {
  console.log(
    `::warning file=tests/e2e/${test.file},line=${String(test.line)}::Flaky on ${test.project}: passed only on try ${String(test.tries)}`,
  );
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Flaky end-to-end tests\n\n${lines.join('\n')}\n`,
  );
}
