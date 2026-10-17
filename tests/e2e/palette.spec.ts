import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const openWithShortcut = async (page: Page) => {
  await page.keyboard.press('Control+KeyK');
  const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' });
  await expect(dialog).toBeVisible();
  // The index loads on first open; wait until options are listed.
  await expect(dialog.getByRole('option').first()).toBeVisible();
  return dialog;
};

test.describe('command palette', () => {
  test('Ctrl+K finds a project without accents and opens it with Enter', async ({ page }) => {
    await page.goto('/');
    const dialog = await openWithShortcut(page);
    const input = dialog.getByRole('combobox');
    await expect(input).toBeFocused();

    await input.fill('telemetria');
    const first = dialog.getByRole('option').first();
    await expect(first).toContainText('Telemetría de generación eléctrica');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute(
      'aria-activedescendant',
      (await first.getAttribute('id')) ?? '',
    );

    await input.press('Enter');
    await expect(page).toHaveURL(/\/proyectos\/plant-telemetry$/);
  });

  test('arrow keys move the active option and wrap around', async ({ page }) => {
    await page.goto('/');
    const dialog = await openWithShortcut(page);
    const input = dialog.getByRole('combobox');
    const options = dialog.getByRole('option');
    const count = await options.count();

    await input.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await input.press('ArrowUp');
    await input.press('ArrowUp');
    await expect(options.nth(count - 1)).toHaveAttribute('aria-selected', 'true');
  });

  test('Escape closes it and returns focus to the button that opened it', async ({ page }) => {
    await page.goto('/notas');
    const trigger = page.getByRole('button', { name: /Buscar/ });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Buscar en el sitio' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('runs actions: language', async ({ page }) => {
    await page.goto('/proyectos/plant-telemetry');
    const dialog = await openWithShortcut(page);
    await dialog.getByRole('combobox').fill('ingles');
    await dialog.getByRole('combobox').press('Enter');
    await expect(page).toHaveURL(/\/en\/projects\/plant-telemetry$/);
  });

  test('copies the email address and says so', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions are granted only in Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const dialog = await openWithShortcut(page);
    await dialog.getByRole('combobox').fill('correo');
    await dialog.getByRole('combobox').press('Enter');
    await expect(dialog.getByRole('status')).toHaveText('Correo copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'juanpablocespedesj@gmail.com',
    );
  });

  test('says when nothing matches', async ({ page }) => {
    await page.goto('/');
    const dialog = await openWithShortcut(page);
    await dialog.getByRole('combobox').fill('zzzz qqqq');
    await expect(dialog.getByRole('option')).toHaveCount(0);
    await expect(dialog.getByRole('status')).toHaveText('Nada coincide con esa búsqueda.');
  });

  test('is accessible while open', async ({ page }) => {
    await page.goto('/');
    await openWithShortcut(page);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });
});
