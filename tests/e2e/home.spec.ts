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

test.describe('home sections', () => {
  test('renders every section in order with real content', async ({ page }) => {
    await page.goto('/');
    const headings = page.locator('main h2');
    await expect(headings).toHaveText([
      'Resultados que se pueden verificar',
      'Sistemas en producción y código abierto',
      'Cada habilidad, con el proyecto que la demuestra',
      'Experiencia y formación',
      'Trabajemos juntos',
      'Formación y certificaciones',
      'Pregúntale a mi portafolio',
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
    await expect(page.getByRole('heading', { name: 'Trabajemos juntos' })).toBeInViewport();
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

test.describe('project filter', () => {
  test('narrows the list by capability and announces the count', async ({ page }) => {
    await page.goto('/#projects');
    const filter = page.getByRole('group', { name: 'Filtrar por capacidad' });
    const rows = page.locator('#projects li[data-capabilities]');
    await expect(rows).toHaveCount(7);

    const legacy = filter.getByRole('button', { name: 'Sistemas heredados' });
    await legacy.click();
    await expect(legacy).toHaveAttribute('aria-pressed', 'true');
    await expect(rows.filter({ visible: true })).toHaveCount(1);
    await expect(page.locator('[data-filter-status]')).toHaveText('1 proyecto');

    await filter.getByRole('button', { name: 'Frontend' }).click();
    await expect(rows.filter({ visible: true })).toHaveCount(3);
    await expect(page.locator('[data-filter-status]')).toHaveText('3 proyectos');

    await filter.getByRole('button', { name: 'Todos' }).click();
    await expect(rows.filter({ visible: true })).toHaveCount(7);
    await expect(page.locator('[data-filter-status]')).toHaveText('7 proyectos');
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
