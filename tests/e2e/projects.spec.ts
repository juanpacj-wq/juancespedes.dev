import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

/** Every project folder in content/ must have a page; a new project is covered automatically. */
const PROJECTS_DIR = join(process.cwd(), 'content', 'projects');
const SLUGS = readdirSync(PROJECTS_DIR).filter((name) =>
  statSync(join(PROJECTS_DIR, name)).isDirectory(),
);

const CASE_STUDY_SECTIONS = [
  'El problema',
  'Mi rol',
  'Restricciones',
  'Decisiones',
  'Arquitectura',
  'Resultados',
  'Qué haría distinto',
  'Tecnologías',
];

test.describe('project pages', () => {
  for (const slug of SLUGS) {
    test(`/proyectos/${slug} follows the case-study template`, async ({ page }) => {
      const response = await page.goto(`/proyectos/${slug}`);
      expect(response?.status()).toBe(200);

      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
      await expect(page.locator('main section[id] > h2')).toHaveText(CASE_STUDY_SECTIONS);
      await expect(page.getByRole('list', { name: 'Diagrama de arquitectura' })).toBeVisible();
      await expect(page.getByText('Fuente:').first()).toBeVisible();
      await expect(page).toHaveTitle(/\| Juan Céspedes$/);
    });
  }

  test('a row on the home page opens its project', async ({ page }) => {
    await page.goto('/#projects');
    await page.locator('#project-invoice-etl-rescue').getByRole('link').click();
    await expect(page).toHaveURL(/\/proyectos\/invoice-etl-rescue$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Rescate de un ETL de facturación electrónica que fallaba en silencio',
    );
  });

  test('previous and next links walk the projects in display order', async ({ page }) => {
    await page.goto('/proyectos/operations-logbook');
    const more = page.getByRole('navigation', { name: 'Más proyectos' });
    await expect(more.getByRole('link')).toHaveCount(1);

    await more.getByRole('link', { name: /Siguiente/ }).click();
    await expect(page).toHaveURL(/\/proyectos\/plant-telemetry$/);
    await page
      .getByRole('navigation', { name: 'Más proyectos' })
      .getByRole('link', { name: /Anterior/ })
      .click();
    await expect(page).toHaveURL(/\/proyectos\/operations-logbook$/);
  });

  test('the back link returns to the project list', async ({ page }) => {
    await page.goto('/proyectos/linkedin-pilot');
    await page.getByRole('link', { name: 'Todos los proyectos' }).click();
    await expect(page).toHaveURL(/\/#projects$/);
  });

  test('public links open outside and anonymized cases say so', async ({ page }) => {
    await page.goto('/proyectos/linkedin-pilot');
    const repo = page.getByRole('link', { name: /Código en GitHub/ });
    await expect(repo).toHaveAttribute('href', 'https://github.com/juanpacj-wq/linkedin-mcp');
    await expect(repo).toHaveAttribute('target', '_blank');

    await page.goto('/proyectos/plant-telemetry');
    await expect(page.getByText(/Sistema interno: el código es privado/)).toBeVisible();
  });
});

test.describe('not found', () => {
  test('an unknown address answers 404 with a way home', async ({ page }) => {
    const response = await page.goto('/proyectos/no-existe');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
