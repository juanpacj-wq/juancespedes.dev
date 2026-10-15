import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets two checkouts (git worktrees) run their suites at once: an existing server on the
// port is reused locally, so a shared port would test the other checkout's build.
const PORT = process.env.E2E_PORT ?? '4330';
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  // Locally a timeout is retried once before it is reported: a busy workstation is not a bug.
  // CI keeps two retries and lists every test that needed one (scripts/flaky-summary.mjs), so a
  // flaky test is visible instead of hidden by the retry.
  retries: CI ? 2 : 1,
  // Three browsers and workerd on one machine: the default (half the cores) overloads a
  // workstation and turns slow pages into timeouts (docs/runbooks/deploy-friction.md).
  ...(CI ? {} : { workers: 3 }),
  reporter: CI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Runs the production build on workerd, the same runtime as Cloudflare.
  webServer: {
    command: `pnpm preview --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
