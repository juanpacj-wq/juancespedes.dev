import { expect, test, type Page } from '@playwright/test';

/*
 * The preview server (wrangler, as in production) applies dist/client/_headers, so these tests
 * see the real headers. A CSP violation does not always break a page visibly, so every page is
 * loaded while recording the browser's securitypolicyviolation events.
 */

const PAGES = [
  '/',
  '/en',
  '/proyectos/plant-telemetry',
  '/en/projects/corporate-portal',
  '/privacidad',
];

const recordViolations = async (page: Page) => {
  await page.addInitScript(() => {
    const store: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: store });
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
};

const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);

test.describe('security headers', () => {
  test('pages and the API send the hardening headers', async ({ request }) => {
    for (const path of ['/', '/en/projects/plant-telemetry', '/api/health']) {
      const headers = (await request.get(path)).headers();
      expect(headers['strict-transport-security'], path).toContain('max-age=63072000');
      expect(headers['x-content-type-options'], path).toBe('nosniff');
      expect(headers['x-frame-options'], path).toBe('DENY');
      expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy'], path).toContain('camera=()');
      expect(headers['content-security-policy'], path).toContain("frame-ancestors 'none'");
    }
    const page = (await request.get('/')).headers()['content-security-policy'] ?? '';
    expect(page).toMatch(/script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+ /);
    expect(page).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  for (const path of PAGES) {
    test(`${path} runs without content security policy violations`, async ({ page }) => {
      await recordViolations(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await violations(page)).toEqual([]);
    });
  }

  test('the theme switch and the contact form work under the policy', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'The Turnstile widget does not load in headless WebKit; covered on Chromium and mobile',
    );
    await recordViolations(page);
    await page.goto('/#contact');
    // The form is an island hydrated when visible: check it before anything scrolls away.
    await page.locator('#contact form').scrollIntoViewIfNeeded();
    await expect(page.locator('#contact astro-island')).not.toHaveAttribute('ssr', {
      timeout: 15_000,
    });
    // Turnstile renders inside a shadow root; its token in the form proves its script ran.
    await expect(page.locator('#contact input[name="cf-turnstile-response"]')).not.toHaveValue('', {
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Cambiar a tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await violations(page)).toEqual([]);
  });
});

test.describe('browser error reports', () => {
  test('an uncaught error is reported without data about the visitor', async ({ page }) => {
    // Playwright does not expose sendBeacon bodies, so the page keeps a copy of what it sends.
    await page.addInitScript(() => {
      const sent: string[] = [];
      Object.defineProperty(window, '__beacons', { value: sent });
      const original = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, data) => {
        if (data instanceof Blob) void data.text().then((text) => sent.push(text));
        return original(url, data);
      };
    });
    await page.goto('/proyectos/plant-telemetry');
    const reported = page.waitForResponse('**/api/client-errors');
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('e2e probe');
      });
    });
    expect((await reported).status()).toBe(204);

    const beacons = await page.evaluate(
      () => (window as unknown as { __beacons: string[] }).__beacons,
    );
    const report: unknown = JSON.parse(beacons[0] ?? '{}');
    expect(report).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('e2e probe'),
      page: '/proyectos/plant-telemetry',
    });
    // Only the error itself and the page: nothing that identifies the visitor.
    const allowed = ['column', 'kind', 'line', 'message', 'page', 'release', 'source'];
    expect(Object.keys(report as object).filter((key) => !allowed.includes(key))).toEqual([]);
  });
});
