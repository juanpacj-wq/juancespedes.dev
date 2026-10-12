import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('home page renders in Spanish with the owner name', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Juan Céspedes');
  });

  test('health endpoint reports ok and is not cached', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });
});
