import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

/** Every note folder in content/ must have a page in both languages. */
const NOTES_DIR = join(process.cwd(), 'content', 'notes');
const NOTE_SLUGS = readdirSync(NOTES_DIR).filter((name) =>
  statSync(join(NOTES_DIR, name)).isDirectory(),
);

test.describe('technical notes', () => {
  test('the index lists every note and opens it', async ({ page }) => {
    await page.goto('/notas');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notas técnicas');
    const rows = page.locator('main ol > li');
    await expect(rows).toHaveCount(NOTE_SLUGS.length);

    await rows.first().getByRole('link').click();
    await expect(page).toHaveURL(/\/notas\/[a-z0-9-]+$/);
    await expect(page.locator('main time').first()).toHaveAttribute(
      'datetime',
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  for (const slug of NOTE_SLUGS) {
    for (const path of [`/notas/${slug}`, `/en/notes/${slug}`]) {
      test(`${path} renders the article with its outline`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
        await expect(page.locator('.prose h2').first()).toBeVisible();

        // Every outline entry jumps to a heading that exists in the article.
        for (const href of await page
          .locator('nav[aria-labelledby="note-outline"] a')
          .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))) {
          await expect(page.locator(href)).toHaveCount(1);
        }
      });
    }
  }

  test("code sits on the site surface, not on Shiki's own background", async ({ page }) => {
    await page.goto('/notas/strict-csp-astro-cloudflare');
    const background = await page
      .locator('.prose pre')
      .first()
      .evaluate((pre) => getComputedStyle(pre).backgroundColor);
    // --surface-raised (global.css).
    expect(background).toBe('rgb(30, 28, 25)');
  });
});

test.describe('now page', () => {
  test('says when it was last updated, in both languages', async ({ page }) => {
    await page.goto('/ahora');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('En qué estoy ahora');
    await expect(page.locator('main time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
    const sections = await page.locator('main section h2').count();
    expect(sections).toBeGreaterThan(0);

    await page.goto('/en/now');
    await expect(page.locator('main section h2')).toHaveCount(sections);
  });

  test('the footer links to notes and to the now page', async ({ page }) => {
    await page.goto('/en');
    const footer = page.getByRole('contentinfo');
    await footer.getByRole('link', { name: 'Notes' }).click();
    await expect(page).toHaveURL(/\/en\/notes$/);
    await page.getByRole('contentinfo').getByRole('link', { name: 'Now' }).click();
    await expect(page).toHaveURL(/\/en\/now$/);
  });
});
