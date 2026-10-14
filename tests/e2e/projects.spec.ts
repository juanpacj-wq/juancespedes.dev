import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/** Every project folder in content/ must have a page; a new project is covered automatically. */
const PROJECTS_DIR = join(process.cwd(), 'content', 'projects');
const SLUGS = readdirSync(PROJECTS_DIR).filter((name) =>
  statSync(join(PROJECTS_DIR, name)).isDirectory(),
);

const TEMPLATE = {
  es: {
    path: (slug: string) => `/proyectos/${slug}`,
    sections: [
      'El problema',
      'Mi rol',
      'Restricciones',
      'Decisiones',
      'Arquitectura',
      'Resultados',
      'Qué haría distinto',
      'Tecnologías',
    ],
    diagram: 'Diagrama de arquitectura',
    source: 'Fuente:',
  },
  en: {
    path: (slug: string) => `/en/projects/${slug}`,
    sections: [
      'The problem',
      'My role',
      'Constraints',
      'Decisions',
      'Architecture',
      'Results',
      'What I would do differently',
      'Technologies',
    ],
    diagram: 'Architecture diagram',
    source: 'Source:',
  },
} as const;

test.describe('project pages', () => {
  for (const [locale, template] of Object.entries(TEMPLATE)) {
    for (const slug of SLUGS) {
      test(`${template.path(slug)} follows the case-study template`, async ({ page }) => {
        const response = await page.goto(template.path(slug));
        expect(response?.status()).toBe(200);

        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
        await expect(page.locator('main section[id] > h2')).toHaveText([...template.sections]);
        await expect(page.getByRole('list', { name: template.diagram })).toBeVisible();
        await expect(page.getByText(template.source).first()).toBeVisible();
        await expect(page).toHaveTitle(/\| Juan Céspedes$/);
      });
    }
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

  // The "404" field is decoration: hidden from assistive technology, drawn once its fonts load.
  const inkedPixels = (page: Page) =>
    page.locator('canvas.not-found-field').evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels ? pixels.filter((value, index) => index % 4 === 3 && value > 0).length : 0;
    });

  test('the 404 draws its field behind the words and keeps it out of the accessibility tree', async ({
    page,
  }) => {
    await page.goto('/proyectos/no-existe');
    const field = page.locator('canvas.not-found-field');
    await expect(field).toHaveAttribute('aria-hidden', 'true');
    await expect(field).toHaveAttribute('data-ready', '');
    await expect.poll(() => inkedPixels(page)).toBeGreaterThan(1000);
  });

  test('with reduced motion the 404 field is drawn once and stays still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/proyectos/no-existe');
    await expect(page.locator('canvas.not-found-field')).toHaveAttribute('data-ready', '');
    await expect.poll(() => inkedPixels(page)).toBeGreaterThan(1000);
    const snapshot = () =>
      page
        .locator('canvas.not-found-field')
        .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    const first = await snapshot();
    await page.waitForTimeout(500);
    expect(await snapshot()).toBe(first);
  });
});
