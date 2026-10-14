import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * "Ask me" against the production build on workerd with the free fake model (CHAT_MODEL=fake in
 * .dev.vars). The real model is covered by the evaluation set (pnpm eval:chat), not here. The
 * chat is a floating panel on every page, opened from the sphere in the bottom-right corner.
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Each test is its own visitor, so the per-minute and daily limits do not leak between tests.
 * Random, because parallel workers each have their own module state.
 */
const asNewVisitor = async (page: Page) => {
  const octet = () => String(1 + Math.floor(Math.random() * 250));
  const ip = `10.${octet()}.${octet()}.${octet()}`;
  await page.route('**/api/chat', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'cf-connecting-ip': ip } }),
  );
};

const openChat = async (page: Page, path = '/', name = 'Pregúntame') => {
  await page.addInitScript(() => {
    const store: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: store });
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.goto(path);
  await page.locator('.chat-trigger').click();
  const panel = page.getByRole('dialog', { name });
  await expect(panel).toBeVisible();
  // Turnstile test keys solve on their own; the suggestions enable once a token exists.
  await expect(panel.locator('[data-chat-example]').first()).toBeEnabled({ timeout: 20_000 });
  return panel;
};

/** Waits until a fresh Turnstile token is ready for the next question. */
const readyToAsk = async (panel: ReturnType<Page['getByRole']>) => {
  await expect(panel.locator('[data-chat-example]').first()).toBeEnabled({ timeout: 20_000 });
};

test.describe('ask me', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName === 'webkit',
      'The Turnstile widget does not load in headless WebKit; covered on Chromium and mobile',
    );
  });

  test('a suggested question streams an answer with a card to the case study', async ({ page }) => {
    await asNewVisitor(page);
    const panel = await openChat(page);
    await panel.getByRole('button', { name: '¿Ha trabajado con Oracle?' }).click();

    const log = panel.getByRole('log');
    await expect(log).toContainText('¿Ha trabajado con Oracle?');
    const inline = log.locator('.chat-bubble a').first();
    await expect(inline).toHaveAttribute('href', /^\/proyectos\/[a-z0-9-]+$/);
    const card = log.locator('.chat-link-card').first();
    await expect(card).toHaveAttribute('href', /^\/proyectos\/[a-z0-9-]+$/);

    await card.click();
    await expect(page).toHaveURL(/\/proyectos\/[a-z0-9-]+$/);
  });

  test('keeps the conversation for follow-up questions and can start over', async ({ page }) => {
    await asNewVisitor(page);
    const panel = await openChat(page);
    const input = panel.getByLabel('Tu pregunta');
    await input.fill('¿Qué hizo en telemetría?');
    await input.press('Enter');
    await expect(panel.getByRole('log')).toContainText('Respuesta de prueba');
    await readyToAsk(panel);

    await input.fill('¿Y con qué tecnologías?');
    await input.press('Enter');
    await expect(panel.getByRole('log')).toContainText('¿Y con qué tecnologías?');
    await expect(panel.locator('.chat-message[data-role="assistant"]')).toHaveCount(2);

    await panel.getByRole('button', { name: 'Nueva conversación' }).click();
    await expect(panel.locator('.chat-message')).toHaveCount(0);
    await expect(panel.getByRole('button', { name: '¿Ha trabajado con Oracle?' })).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
      ),
    ).toEqual([]);
  });

  test('the conversation follows the visitor to another page', async ({ page }) => {
    await asNewVisitor(page);
    const panel = await openChat(page);
    await panel.getByRole('button', { name: '¿Ha trabajado con Oracle?' }).click();
    await expect(panel.locator('.chat-message[data-role="assistant"]')).toContainText(
      'Respuesta de prueba',
    );

    await page.goto('/proyectos/plant-telemetry');
    await page.locator('.chat-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Pregúntame' }).getByRole('log')).toContainText(
      '¿Ha trabajado con Oracle?',
    );
  });

  test('explains a question that is too short without sending it', async ({ page }) => {
    await asNewVisitor(page);
    let sent = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/chat')) sent += 1;
    });
    const panel = await openChat(page);
    await panel.getByLabel('Tu pregunta').fill('ok');
    await panel.getByRole('button', { name: 'Enviar' }).click();
    await expect(panel.getByRole('status')).toHaveText(
      'Escribe una pregunta de entre 3 y 500 caracteres.',
    );
    expect(sent).toBe(0);
  });

  test('says when the visitor asks too fast', async ({ page }) => {
    await asNewVisitor(page);
    const panel = await openChat(page);
    const input = panel.getByLabel('Tu pregunta');
    const send = panel.getByRole('button', { name: 'Enviar' });
    // Three questions per minute are allowed; the fourth is refused by the server.
    for (let index = 1; index <= 4; index += 1) {
      await readyToAsk(panel);
      await input.fill(`Pregunta número ${String(index)}`);
      await send.click();
      await expect(send).toBeDisabled();
    }
    await expect(panel.getByRole('status')).toHaveText(
      'Hiciste varias preguntas seguidas. Espera un minuto e inténtalo de nuevo.',
      { timeout: 20_000 },
    );
  });

  test('is accessible with a conversation on screen', async ({ page }) => {
    await asNewVisitor(page);
    const panel = await openChat(page);
    await panel.getByRole('button', { name: '¿Ha trabajado con Oracle?' }).click();
    await expect(panel.locator('.chat-link-card').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('#chat-panel')
      .include('.chat-trigger')
      .withTags(WCAG)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('speaks English on the English pages', async ({ page }) => {
    await asNewVisitor(page);
    const panel = await openChat(page, '/en', 'Ask me');
    await panel.getByRole('button', { name: 'Has he worked with Oracle?' }).click();
    await expect(panel.locator('.chat-link-card').first()).toHaveAttribute(
      'href',
      /^\/en\/projects\/[a-z0-9-]+$/,
    );
  });
});

test.describe('chat panel', () => {
  test('Escape closes it and gives focus back to the sphere', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.chat-trigger');
    await trigger.click();
    const panel = page.getByRole('dialog', { name: 'Pregúntame' });
    await expect(panel).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('the header link opens it on wide screens', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The section links live in the desktop header');
    await page.goto('/proyectos/plant-telemetry');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('button', { name: 'Pregúntame' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Pregúntame' })).toBeVisible();
  });
});

test('the status endpoint reports the chat on, without any balance detail', async ({ request }) => {
  // The fake model has no prepaid balance to watch, so the chat is simply on.
  const response = await request.get('/api/chat-status', {
    headers: { 'cf-connecting-ip': '10.250.0.1' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ chat: 'on' });
});
