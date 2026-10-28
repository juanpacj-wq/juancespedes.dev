import { expect, test, type Page } from '@playwright/test';

/*
 * Each contact test gets its own client IP so the real rate limiter (5 per minute per IP) does not
 * leak between tests. In production Cloudflare sets CF-Connecting-IP itself; clients cannot.
 */
let ipCounter = 0;
const uniqueIp = () => `198.51.100.${String((ipCounter += 1) % 250)}`;

/** Sets a client IP on calls to our own contact endpoint only (Turnstile must not see it). */
const useClientIp = async (page: Page) => {
  const ip = uniqueIp();
  await page.route('**/api/contact', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': ip } }),
  );
};

/** The form is a hydrated island: interact only once React owns it. */
const openContactForm = async (page: Page) => {
  // Smooth scrolling and the button's hover scale keep targets moving; on a slow WebKit the submit
  // button was not stable in time. Reduced motion keeps every behavior the tests check.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#contact');
  // The form hydrates when it becomes visible (client:visible). Under load WebKit sometimes skips
  // the jump to #contact while the page is still loading, so scroll to it like a reader would.
  await page.locator('#contact form').scrollIntoViewIfNeeded();
  // Astro removes the `ssr` attribute from an island once it has hydrated.
  await expect(page.locator('#contact astro-island')).not.toHaveAttribute('ssr', {
    timeout: 15_000,
  });
  return page.locator('#contact form');
};

test.describe('hero art', () => {
  test('the painting is announced as one image and its light switch toggles', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('img', { name: /Narciso de Caravaggio/ })).toBeVisible();
    const toggle = page.getByRole('button', { name: 'Encender la luz' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Apagar la luz' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.ascii-canvas')).toHaveAttribute('data-lit', '');
  });

  test('prices start from a floor or are quoted, in each language and currency', async ({
    page,
  }) => {
    await page.goto('/#services');
    const services = page.locator('#services');
    await expect(services.getByText(/^\$\s2\.500\.000$/)).toBeVisible();
    await expect(services.getByText('Por cotización', { exact: true })).toBeVisible();
    await page.goto('/en#services');
    await expect(page.locator('#services').getByText('$650', { exact: true })).toBeVisible();
    await expect(
      page.locator('#services').getByText('Custom quote', { exact: true }),
    ).toBeVisible();
  });
});

test.describe('home sections', () => {
  test('renders every section in order with real content', async ({ page }) => {
    await page.goto('/');
    const headings = page.locator('main h2');
    await expect(headings).toHaveText([
      'Proyectos',
      'Sobre mí',
      'Stack',
      'Resultados',
      'Servicios',
      'Certificaciones',
      'Hablemos',
    ]);
  });

  test('results show a figure and where it came from, and open the case behind it', async ({
    page,
  }) => {
    await page.goto('/#impact');
    const cards = page.locator('#impact li:has(h3)');
    await expect(cards).toHaveCount(8);
    const featured = cards.first();
    await expect(featured.getByRole('heading', { level: 3 })).toHaveText(
      'Cero vulnerabilidades graves en una auditoría externa',
    );
    // The source and the story live on the project page; the home page names the project.
    await expect(featured).toContainText('Portal corporativo');
    await featured.getByRole('link').click();
    await expect(page).toHaveURL(/\/proyectos\/corporate-portal$/);
  });

  test('a header link lands its section right under the header', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The section links live in the desktop header');
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Stack' })
      .click();
    await expect(page).toHaveURL(/#capabilities$/);
    // The title sits below the 4rem header, not a quarter of the screen further down.
    const top = () =>
      page.evaluate(
        () => document.getElementById('capabilities-title')?.getBoundingClientRect().top,
      );
    await expect.poll(top).toBeGreaterThan(64);
    await expect.poll(top).toBeLessThan(160);
  });

  test('the header marks the section being read', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The section links live in the desktop header');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav.locator('[aria-current]')).toHaveCount(0);
    await nav.getByRole('link', { name: 'Servicios' }).click();
    await expect(nav.locator('[aria-current="location"]')).toHaveAttribute('href', '#services');
    await nav.getByRole('link', { name: 'Contacto' }).click();
    await expect(nav.locator('[aria-current="location"]')).toHaveAttribute('href', '#contact');
  });

  test('the contact rail offers LinkedIn, GitHub and email on wide screens', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'The rail shows from 80rem; phones use the contact section');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const rail = page.getByRole('navigation', { name: 'Contacto directo' });
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('link')).toHaveCount(3);
    await expect(rail.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('target', '_blank');
    await expect(rail.getByRole('link', { name: 'Correo directo' })).toHaveAttribute(
      'href',
      /^mailto:/,
    );
  });

  test('header links jump to their sections', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The section links live in the desktop header');
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Servicios' })
      .click();
    await expect(page).toHaveURL(/#services$/);
    await expect(page.getByRole('heading', { name: 'Servicios', exact: true })).toBeInViewport();
  });

  test('the stack lists each area with its technologies and loads its logos on approach', async ({
    page,
  }) => {
    await page.goto('/');
    const stack = page.locator('#capabilities');
    await expect(stack.getByRole('heading', { level: 3 })).toContainText([
      'Frontend',
      'Backend',
      'Datos y BI',
    ]);
    await expect(stack.getByRole('listitem').filter({ hasText: 'PostgreSQL' })).toBeVisible();
    await expect(stack.getByRole('link')).toHaveCount(0);
    // The sprite waits until the section comes near, so it is not part of the first load.
    const logo = stack.locator('use').first();
    await expect(logo).not.toHaveAttribute('href', /./);
    await stack.scrollIntoViewIfNeeded();
    await expect(logo).toHaveAttribute('href', /^\/tech-logos\.svg#[a-z0-9-]+$/);
  });
});

test.describe('hero headline', () => {
  test('is read once, whole, while the visible role rotates', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveAccessibleName(
      'Hola, soy Juan, ingeniero full-stack, de datos, backend, de automatización y de IA aplicada.',
    );
    const ticker = page.locator('[data-role-ticker]');
    // The rotation moves on by itself, one role at a time.
    await expect(ticker).toHaveAttribute('style', /--role: ?1(;|$)/, { timeout: 6000 });
  });

  test('keeps the role next to "ingeniero", also after coming from English', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'On a phone the role wraps onto its own line');
    // The visible space between the prefix and the role on screen, in px.
    const gap = () =>
      page.evaluate(() => {
        const prefix = document.querySelector('[data-role-prefix]');
        const ticker = document.querySelector<HTMLElement>('[data-role-ticker]');
        if (!prefix || !ticker) return Number.NaN;
        const index = Number(ticker.style.getPropertyValue('--role') || '0');
        const role = ticker.children[index];
        if (!role) return Number.NaN;
        return role.getBoundingClientRect().left - prefix.getBoundingClientRect().right;
      });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect.poll(gap).toBeLessThan(40);
    await page.goto('/en');
    await page.getByRole('banner').getByRole('link', { name: /^ES/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(gap).toBeLessThan(40);
  });

  test('stays on the first role when the visitor prefers less motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(3500);
    const first = page.locator('[data-role-ticker] > *').first();
    await expect(first).toHaveText('full-stack');
    await expect(first).toBeInViewport();
    await expect(page.locator('[data-role-ticker]')).not.toHaveAttribute('style', /--role/);
  });
});

test.describe('projects', () => {
  test('projects are grouped by area, one area at a time', async ({ page }) => {
    await page.goto('/#projects');
    const tabs = page.getByRole('tablist', { name: 'Áreas de trabajo' }).getByRole('tab');
    await expect(tabs).toHaveText([/Full-stack/, /Analítica/, /IA y automatización/]);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#work-full-stack [data-stage-slide]')).toHaveCount(6);
    await expect(page.locator('#work-analytics [data-stage-slide]')).toHaveCount(5);
    await expect(page.locator('#work-automation [data-stage-slide]')).toHaveCount(4);
    await expect(page.locator('#work-analytics')).toBeHidden();
    // The full-stack area in the order the author set.
    await expect(page.locator('#work-full-stack [data-stage-slide] h3')).toHaveText([
      /foro corporativo/,
      /Portal corporativo/,
      /Bitácora digital/,
      /Telemetría/,
      /Este portafolio/,
      /Hoja de vida digital/,
    ]);
    // One link per project, named by the project's title.
    const slide = page.locator('#project-operations-logbook');
    await expect(slide.getByRole('link')).toHaveCount(1);
    await expect(slide.getByRole('link')).toHaveAccessibleName(/Bitácora digital de operación/);
  });

  test('a tab opens its area on its first project', async ({ page }) => {
    await page.goto('/#projects');
    const tablist = page.getByRole('tablist', { name: 'Áreas de trabajo' });
    await tablist.getByRole('tab', { name: /Analítica/ }).click();
    await expect(page.locator('#work-analytics')).toBeVisible();
    await expect(page.locator('#work-full-stack')).toBeHidden();
    await expect(page.locator('#work-analytics [data-stage-slide] h3')).toHaveText([
      /programa de energía solar/,
      /Cuadro de mando/,
      /precipitaciones/,
      /Ejecución presupuestal/,
      /mina de carbón/,
    ]);
    await expect(page).toHaveURL(/#work-analytics$/);
    // Arrow keys move between areas.
    await page.keyboard.press('ArrowRight');
    await expect(tablist.getByRole('tab', { name: /IA y automatización/ })).toBeFocused();
    await expect(page.locator('#work-automation')).toBeVisible();
  });

  test('an address that names an area opens on it', async ({ page }) => {
    await page.goto('/#work-automation');
    await expect(page.getByRole('tab', { name: /IA y automatización/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('#project-solar-fleet-telemetry')).toBeInViewport();
  });

  test('a click anywhere on a project opens its case study', async ({ page }) => {
    // Reduced motion keeps the projects as a list, so the click lands on a still box.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#projects');
    // On the screenshot, away from the title: the link covers the whole project.
    const shot = page.locator('#project-plant-telemetry .project-stage-shot');
    await shot.scrollIntoViewIfNeeded();
    const box = await shot.boundingBox();
    if (!box) throw new Error('project not laid out');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/proyectos\/plant-telemetry$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Telemetría de generación eléctrica en tiempo real',
    );
  });

  test.describe('the pinned stage', () => {
    test.skip(({ isMobile }) => isMobile, 'Phones keep the projects as a list');

    const stage = (page: Page) => page.locator('#work-full-stack [data-project-stage]');
    const current = (page: Page) =>
      page.getByRole('navigation', { name: 'Ir a un proyecto' }).locator('[aria-current]');
    /** Whether a project's title sits inside the stage's visible frame (it clips the others). */
    const onStage = (page: Page, slug: string) =>
      page.evaluate((id) => {
        const frame = document
          .querySelector('.work-panel:not([hidden]) .project-stage-slides')
          ?.getBoundingClientRect();
        const title = document.querySelector(`#project-${id} h3`)?.getBoundingClientRect();
        if (!frame || !title) return false;
        return (
          title.top >= frame.top &&
          title.bottom <= frame.bottom &&
          frame.top >= 0 &&
          frame.bottom <= innerHeight
        );
      }, slug);

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await expect(stage(page)).toHaveAttribute('data-stage-ready', '');
    });

    test('scrolling past it brings the next project on instead of moving the page', async ({
      page,
    }) => {
      await stage(page).evaluate((root: HTMLElement) => {
        // Two fifths of the way: the third of six projects, holding still.
        const span = root.offsetHeight - innerHeight;
        scrollTo({
          top: root.getBoundingClientRect().top + scrollY + span * 0.4,
          behavior: 'instant',
        });
      });
      await expect(current(page)).toHaveAccessibleName(/Bitácora digital de operación/);
      await expect(stage(page).locator('[data-stage-counter]')).toHaveText('03 / 06');
      // The section is pinned: its title and tabs stay in view while the projects change.
      await expect(page.locator('#projects-title')).toBeInViewport();
      await expect(page.getByRole('tab', { name: /Analítica/ })).toBeInViewport();
    });

    test('switching areas mid-stage starts the new one at its first project', async ({ page }) => {
      await stage(page).evaluate((root: HTMLElement) => {
        const span = root.offsetHeight - innerHeight;
        scrollTo({
          top: root.getBoundingClientRect().top + scrollY + span * 0.75,
          behavior: 'instant',
        });
      });
      await page.getByRole('tab', { name: /Analítica/ }).click();
      await expect(current(page)).toHaveAccessibleName(/programa de energía solar/);
      await expect.poll(() => onStage(page, 'solar-program-finance')).toBe(true);
      await expect(page.locator('#projects-title')).toBeInViewport();
    });

    test('the link under the rail leads on to the next area', async ({ page }) => {
      // Short screens keep only the thumbnails under the rail; the tabs lead on there.
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.locator('#projects').scrollIntoViewIfNeeded();
      await page
        .locator('#work-full-stack')
        .getByRole('link', { name: /Siguiente\s*Analítica/ })
        .click();
      await expect(page.getByRole('tab', { name: /Analítica/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect.poll(() => onStage(page, 'solar-program-finance')).toBe(true);
    });

    test('scrolling runs on from one area to the next and back', async ({ page }) => {
      const tab = (name: RegExp) => page.getByRole('tab', { name });
      /** Holds the active stage on its last project, then scrolls by `delta` with the wheel. */
      const pastTheEnd = async (delta: number) => {
        await page
          .locator('.work-panel:not([hidden]) [data-project-stage]')
          .evaluate((root: HTMLElement) => {
            const top = root.getBoundingClientRect().top + scrollY;
            scrollTo({ top: top + root.offsetHeight - innerHeight, behavior: 'instant' });
          });
        await page.mouse.move(700, 500);
        await page.mouse.wheel(0, delta);
      };

      await pastTheEnd(400);
      await expect(tab(/Analítica/)).toHaveAttribute('aria-selected', 'true');
      await expect(current(page)).toHaveAccessibleName(/programa de energía solar/);

      // Back up from the first project of an area: the previous one, on its last project.
      await page.mouse.wheel(0, -400);
      await expect(tab(/Full-stack/)).toHaveAttribute('aria-selected', 'true');
      await expect(current(page)).toHaveAccessibleName(/Hoja de vida digital/);

      // The last area lets go into the next section.
      await tab(/IA y automatización/).click();
      await pastTheEnd(1200);
      await expect(tab(/IA y automatización/)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#about')).toBeInViewport();
    });

    test('a quick scroll that never rests on the edge still runs on to the next area', async ({
      page,
    }) => {
      // A few screens before the end, as a reader scrolling through the projects would be.
      await stage(page).evaluate((root: HTMLElement) => {
        const top = root.getBoundingClientRect().top + scrollY;
        scrollTo({ top: top + root.offsetHeight - innerHeight * 1.7, behavior: 'instant' });
      });
      await page.mouse.move(700, 500);
      for (let step = 0; step < 16; step += 1) await page.mouse.wheel(0, 70);
      await expect(page.getByRole('tab', { name: /Analítica/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.locator('#about')).not.toBeInViewport();
    });

    test('the rail jumps to a project and the stage shows it', async ({ page }) => {
      const rail = page.getByRole('navigation', { name: 'Ir a un proyecto' });
      await rail.scrollIntoViewIfNeeded();
      await rail.getByRole('link', { name: /Telemetría de generación/ }).click();
      await expect(current(page)).toHaveAccessibleName(/Telemetría de generación/);
      await expect.poll(() => onStage(page, 'plant-telemetry')).toBe(true);
    });

    test('focus on a project that waits off the stage brings it on', async ({ page }) => {
      await page.locator('#project-juancespedes-dev').getByRole('link').focus();
      await expect(current(page)).toHaveAccessibleName(/Este portafolio/);
      await expect.poll(() => onStage(page, 'juancespedes-dev')).toBe(true);
    });
  });
});

test.describe('contact form', () => {
  test('explains every problem and focuses the first invalid field', async ({ page }) => {
    const form = await openContactForm(page);
    await form.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(form.getByRole('status')).toHaveText('Revisa los campos marcados.');
    await expect(form.getByText('Escribe tu nombre.')).toBeVisible();
    await expect(form.getByText('Escribe tu correo.')).toBeVisible();
    await expect(form.getByText('Necesito tu autorización para responderte.')).toBeVisible();
    await expect(form.getByLabel('Nombre')).toBeFocused();
    await expect(form.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true');
  });

  test('sends a complete message end to end', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'The Turnstile widget does not load in headless WebKit; covered on Chromium and mobile',
    );
    await useClientIp(page);
    const form = await openContactForm(page);
    // Turnstile test keys solve automatically; wait until the widget has produced a token.
    await expect(form.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', {
      timeout: 20_000,
    });

    await form.getByLabel('Nombre').fill('Prueba automatizada');
    await form.getByLabel('Correo electrónico').fill('prueba@example.com');
    await form
      .getByLabel('¿En qué te puedo ayudar?')
      .fill('Mensaje enviado por la suite end to end.');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(form.getByRole('status')).toHaveText(/Gracias/);
    await expect(form.getByLabel('Nombre')).toHaveValue('');
  });

  test('the endpoint answers invalid JSON submissions with problem details', async ({
    request,
  }) => {
    const response = await request.post('/api/contact', {
      headers: { accept: 'application/json', 'cf-connecting-ip': uniqueIp() },
      data: { name: '', email: 'x', message: '', consent: 'false', 'cf-turnstile-response': 't' },
    });
    expect(response.status()).toBe(400);
    expect(response.headers()['content-type']).toBe('application/problem+json');
    expect((await response.json()) as unknown).toMatchObject({
      status: 400,
      errors: expect.arrayContaining([{ field: 'email', code: 'invalid-email' }]),
    });
  });

  test('a post without JavaScript comes back to the contact section', async ({ request }) => {
    const response = await request.post('/api/contact', {
      form: {
        name: 'Ana',
        email: 'ana@example.com',
        message: 'Sin JavaScript, sin token.',
        consent: 'on',
      },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe('/?contact=error#contact');
  });

  test('the privacy notice linked from the form exists', async ({ page }) => {
    await page.goto('/#contact');
    await page.locator('#contact form').getByRole('link', { name: 'aviso de privacidad' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aviso de privacidad');
  });
});
