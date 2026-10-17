import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/design-system',
  '/privacidad',
  '/proyectos/plant-telemetry',
  // A case with real screenshots: the gallery, its tabs and captions.
  '/proyectos/corporate-portal',
  '/proyectos/no-existe',
  '/en',
  '/en/projects/plant-telemetry',
  '/en/privacy',
  '/notas',
  '/notas/strict-csp-astro-cloudflare',
  '/en/notes/mutation-testing-coverage',
  '/ahora',
] as const;
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('accessibility', () => {
  for (const path of PAGES) {
    test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('one theme', () => {
  test('stays dark, even for a visitor who chose the light theme before it was removed', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /tema/ })).toHaveCount(0);
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(canvas).toBe('rgb(14, 13, 11)');
  });
});

test.describe('layout', () => {
  test('the first Tab reaches the skip link, which moves focus to the main content', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'Safari only tabs to links when the OS setting allows it');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });

  for (const path of PAGES) {
    test(`${path} has no horizontal scroll at 360 px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }

  test('without a photo, the about section tells the work as a timeline', async ({ page }) => {
    await page.goto('/');
    const about = page.locator('#about');
    await about.scrollIntoViewIfNeeded();
    // No placeholder stands in for the face.
    await expect(about.getByRole('img')).toHaveCount(0);
    await expect(about.getByRole('region', { name: 'Experiencia' })).toContainText('Gecelca');
    await expect(about.getByRole('region', { name: 'Formación' })).toContainText(
      'Universidad del Norte',
    );
    // The live time in Barranquilla replaces the dashes once the script runs.
    await expect(about.locator('[data-clock-time]')).toHaveText(/\d{1,2}:\d{2}/);
  });

  test('pages are served at clean URLs without a redirect', async ({ request }) => {
    const response = await request.get('/design-system', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });

  test('the design system reference is not indexed', async ({ page }) => {
    await page.goto('/design-system');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});
