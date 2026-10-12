import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = ['/', '/design-system'] as const;
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const useTheme = async (page: Page, theme: 'light' | 'dark') => {
  await page.addInitScript((value) => {
    localStorage.setItem('theme', value);
  }, theme);
};

test.describe('accessibility in both themes', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const path of PAGES) {
      test(`${path} has no WCAG 2.2 AA violations in the ${theme} theme`, async ({ page }) => {
        await useTheme(page, theme);
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});

test.describe('theme switch', () => {
  test('defaults to dark and remembers the visitor choice', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: 'Cambiar a tema claro' });

    await expect(html).not.toHaveAttribute('data-theme', 'light');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeVisible();

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
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

  test('the portrait placeholder is announced with its alternative text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('img', { name: 'Retrato de Juan Céspedes' })).toBeVisible();
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
