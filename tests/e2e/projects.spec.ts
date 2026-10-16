import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/** Every project folder in content/ must have a page; a new project is covered automatically. */
const PROJECTS_DIR = join(process.cwd(), 'content', 'projects');
const SLUGS = readdirSync(PROJECTS_DIR).filter((name) =>
  statSync(join(PROJECTS_DIR, name)).isDirectory(),
);

/** A project with real screenshots gets a "solution" chapter right after the problem. */
const IMAGES_DIR = join(process.cwd(), 'src', 'assets', 'projects');
const hasScreenshots = (slug: string) => {
  try {
    return readdirSync(join(IMAGES_DIR, slug)).some((name) =>
      /^(?:gallery|mobile)-\d+\.(?:avif|webp|png|jpe?g)$/.test(name),
    );
  } catch {
    return false;
  }
};
const withSolution = (sections: readonly string[], solution: string, slug: string) =>
  hasScreenshots(slug) ? [...sections.slice(0, 2), solution, ...sections.slice(2)] : [...sections];

const TEMPLATE = {
  es: {
    path: (slug: string) => `/proyectos/${slug}`,
    sections: [
      'En resumen',
      'El problema',
      'Mi rol',
      'Restricciones',
      'Decisiones',
      'Arquitectura',
      'Resultados',
      'Qué haría distinto',
      'Tecnologías',
    ],
    solution: 'La solución',
    diagram: 'Diagrama de arquitectura',
    source: 'Fuente:',
  },
  en: {
    path: (slug: string) => `/en/projects/${slug}`,
    sections: [
      'At a glance',
      'The problem',
      'My role',
      'Constraints',
      'Decisions',
      'Architecture',
      'Results',
      'What I would do differently',
      'Technologies',
    ],
    solution: 'The solution',
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
        await expect(page.locator('main section[data-chapter] h2')).toHaveText(
          withSolution(template.sections, template.solution, slug),
        );
        await expect(page.getByRole('list', { name: template.diagram })).toBeVisible();
        await expect(page.getByText(template.source).first()).toBeVisible();
        await expect(page).toHaveTitle(/\| Juan Céspedes$/);
      });
    }
  }

  test('the problem is told in plain words, with what changed for the people involved', async ({
    page,
  }) => {
    await page.goto('/proyectos/operations-logbook');
    const problem = page.locator('#problem');
    await expect(problem.getByText('Antes:').first()).toBeAttached();
    await expect(
      problem.getByText(
        'El reporte se genera desde los datos, con el formato de la plantilla oficial.',
      ),
    ).toBeVisible();
    await expect(page.locator('#overview .cs-hook')).toContainText('copiando celdas a mano');
  });

  test('the chapter nav appears after the hero and follows the chapter being read', async ({
    page,
  }) => {
    await page.goto('/proyectos/operations-logbook');
    const nav = page.getByRole('navigation', { name: 'Secciones del caso' });
    await expect(nav.getByRole('link', { name: 'Decisiones' })).toBeHidden();

    await page.locator('#decisions').scrollIntoViewIfNeeded();
    const decisions = nav.getByRole('link', { name: 'Decisiones' });
    await expect(decisions).toBeVisible();
    await expect(decisions).toHaveAttribute('aria-current', 'true');

    await nav.getByRole('link', { name: 'Arquitectura' }).click();
    await expect(page).toHaveURL(/#architecture$/);
  });

  test('the diagram draws a wire per flow and the steps light one flow at a time', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile',
      'wires are drawn only when layers sit side by side',
    );
    await page.goto('/proyectos/operations-logbook');
    await page.locator('.cs-arch').scrollIntoViewIfNeeded();
    const flows = page.locator('#architecture [data-flow]');
    await expect(page.locator('.cs-wire')).toHaveCount(await flows.count());

    await page.getByRole('button', { name: 'Paso siguiente' }).click();
    await expect(flows.first()).toHaveAttribute('data-on', '');
    await expect(page.locator('[data-node="operator-app"]')).toHaveAttribute('data-on', '');
    await expect(page.locator('[data-node="identity"]')).not.toHaveAttribute('data-on', '');
  });

  test('the solution shows real screenshots with captions, tabs and an enlarged view', async ({
    page,
  }) => {
    // The page scrolls smoothly (scroll-behavior), so every scroll Playwright makes before a click
    // is animated and, on a slow WebKit, the target is still moving ("not stable"); the gallery's
    // auto-advance moves the row as well. Reduced motion keeps the tabs and the enlarged view.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/proyectos/corporate-portal');
    const solution = page.locator('#solution');
    await solution.scrollIntoViewIfNeeded();
    const slides = solution.locator('[data-slide]');
    await expect(slides).toHaveCount(3);
    // Every screenshot says what it shows: the caption is also its text alternative.
    for (const image of await solution.locator('[data-slide] img').all()) {
      await expect(image).not.toHaveAttribute('alt', '');
    }

    const tabs = solution.locator('[data-go]');
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute('aria-current', 'true');

    await solution.locator('[data-zoom]').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-lightbox-caption]')).toContainText('Transparencia');
    await dialog.getByRole('button', { name: 'Imagen siguiente' }).click();
    await expect(dialog.locator('[data-lightbox-caption]')).toContainText('regulatoria');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test.describe('on a 2x screen', () => {
    test.use({ deviceScaleFactor: 2 });

    test('a responsive product shows itself on phones and a tablet, sharp on a 2x screen', async ({
      page,
    }) => {
      await page.goto('/proyectos/event-platform');
      const screens = page.locator('.cs-screens');
      await screens.scrollIntoViewIfNeeded();
      await expect(
        screens.getByRole('heading', { name: 'Se adapta a cada pantalla' }),
      ).toBeVisible();
      await expect(screens).toContainText('responsive');
      const devices = screens.getByRole('list', { name: 'Capturas en teléfono y tableta' });
      await expect(devices.getByRole('listitem')).toHaveCount(4);
      await expect(devices.locator('.cs-frame--tablet')).toHaveCount(1);
      for (const image of await devices.locator('img[data-deferred]').all()) {
        await expect(image).not.toHaveAttribute('alt', '');
        // The file has at least twice the pixels of the box it fills: no enlarged, blurred capture.
        await expect
          .poll(() =>
            image.evaluate(async (img: HTMLImageElement) => {
              if (!img.complete || !img.currentSrc) return 0;
              // naturalWidth is corrected by the srcset density; a plain copy gives the file's.
              const file = new Image();
              file.src = img.currentSrc;
              await file.decode();
              return file.naturalWidth / img.clientWidth;
            }),
          )
          .toBeGreaterThanOrEqual(2);
      }
    });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    // Without the script the band is not a scroll region the keyboard cannot reach (WCAG 2.1.1):
    // every logo shows within the screen and the copy that closes the loop is hidden. Axe cannot
    // run here (it needs page scripts), so the layout is checked directly.
    test('the technologies band wraps instead of scrolling', async ({ page }) => {
      await page.goto('/proyectos/invoice-etl-rescue');
      const list = page.getByRole('list', { name: 'Tecnologías' });
      await expect(list.getByRole('img', { name: 'Python' })).toBeVisible();
      await expect(page.locator('.cs-band-row[aria-hidden]')).toBeHidden();

      const width = page.viewportSize()?.width ?? 0;
      for (const item of await list.getByRole('listitem').all()) {
        const box = await item.boundingBox();
        expect(box, 'every logo is laid out').not.toBeNull();
        expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= width).toBe(true);
      }
    });
  });

  test('the technologies band shows logos and can be dragged', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mouse drag; touch scrolls the row natively');
    // The drag goes to coordinates read after a scroll: with smooth scrolling they can be stale.
    // Reduced motion also stops the drift, so only the drag moves the band.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/proyectos/invoice-etl-rescue');
    const band = page.locator('[data-band]');
    await band.scrollIntoViewIfNeeded();
    const list = page.getByRole('list', { name: 'Tecnologías' });
    await expect(list.getByRole('img', { name: 'Python' })).toBeVisible();
    // The motion layer starts after the load event (ProjectArticle.astro); it reveals the chapter
    // nav in the same task that wires the band, so a drag before that would move nothing.
    await expect(page.locator('[data-chapters]')).not.toHaveAttribute('hidden');

    const offset = () =>
      page
        .locator('[data-band-track]')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const box = await band.boundingBox();
    if (!box) throw new Error('band not rendered');
    const before = await offset();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 300, box.y + box.height / 2, { steps: 6 });
    // WebKit applies pointer moves a frame later: poll instead of reading once.
    await expect.poll(offset).toBeLessThan(before - 200);
    await page.mouse.up();
  });

  test('a project on the home page opens its page', async ({ page }) => {
    // Reduced motion keeps the home page projects as a list (the stage has its own tests).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#projects');
    await page.locator('#project-invoice-etl-rescue').getByRole('link').click();
    await expect(page).toHaveURL(/\/proyectos\/invoice-etl-rescue$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Rescate de un ETL de facturación electrónica que perdía facturas sin reportar error',
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
