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
      'Resultados que se pueden verificar',
      'Casos de estudio destacados',
      'Quién está detrás',
      'Cada habilidad, con el proyecto que la demuestra',
      'Experiencia y formación',
      'Servicios y precios',
      'Formación y certificaciones',
      'Cuéntame qué necesitas',
    ]);
    await expect(page.getByText('Fuente:').first()).toBeVisible();
  });

  test('header links jump to their sections', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The section links live in the desktop header');
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Servicios' })
      .click();
    await expect(page).toHaveURL(/#services$/);
    await expect(page.getByRole('heading', { name: 'Servicios y precios' })).toBeInViewport();
  });

  test('skill evidence links open the project that proves them', async ({ page }) => {
    await page.goto('/');
    const evidence = page
      .locator('#capabilities')
      .getByRole('link', { name: /Telemetría/ })
      .first();
    await expect(evidence).toHaveAttribute('href', '/proyectos/plant-telemetry');
    await evidence.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Telemetría de generación eléctrica en tiempo real',
    );
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

test.describe('project cards', () => {
  test('featured cases get the wide card and the rest share a grid', async ({ page }) => {
    await page.goto('/#projects');
    await expect(page.locator('#projects .project-card--feature')).toHaveCount(5);
    await expect(page.locator('#projects .project-card--compact')).toHaveCount(3);
    // One link per card, named by the project's title.
    const card = page.locator('#project-operations-logbook');
    await expect(card.getByRole('link')).toHaveCount(1);
    await expect(card.getByRole('link')).toHaveAccessibleName(/Bitácora digital de operación/);
  });

  test('a click anywhere on a card opens its case study', async ({ page }) => {
    // The click goes to coordinates: with smooth scrolling and the cards' reveal the box is read
    // while the card still moves, and on WebKit the click landed beside it. Reduced motion keeps
    // the link that covers the card.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#projects');
    // On the screen drawing, away from the title: the link covers the whole card.
    const stage = page.locator('#project-plant-telemetry .project-card-stage');
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    if (!box) throw new Error('card not laid out');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/proyectos\/plant-telemetry$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Telemetría de generación eléctrica en tiempo real',
    );
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
