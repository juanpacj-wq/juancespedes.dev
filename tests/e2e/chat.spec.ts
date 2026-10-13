import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * "Ask me" against the production build on workerd with the free fake model (CHAT_MODEL=fake in
 * .dev.vars). The real model is covered by the evaluation set (pnpm eval:chat), not here.
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

const openChat = async (page: Page, path = '/') => {
  await page.addInitScript(() => {
    const store: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: store });
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.goto(`${path}#ask`);
  const section = page.locator('#ask');
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator('astro-island')).not.toHaveAttribute('ssr', { timeout: 15_000 });
  // Turnstile test keys solve on their own; the button enables once a token exists.
  await expect(section.getByRole('button', { name: 'Preguntar' })).toBeEnabled({
    timeout: 20_000,
  });
  return section;
};

test.describe('ask me', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName === 'webkit',
      'The Turnstile widget does not load in headless WebKit; covered on Chromium and mobile',
    );
  });

  test('a suggested question streams an answer that links to a case study', async ({ page }) => {
    await asNewVisitor(page);
    const section = await openChat(page);
    await section.getByRole('button', { name: '¿Ha trabajado con Oracle?' }).click();

    const log = section.getByRole('log');
    await expect(log).toContainText('¿Ha trabajado con Oracle?');
    const link = log.getByRole('link').first();
    await expect(link).toHaveAttribute('href', /^\/proyectos\/[a-z0-9-]+$/);
    await expect(section.getByRole('button', { name: 'Preguntar' })).toBeEnabled({
      timeout: 20_000,
    });

    await link.click();
    await expect(page).toHaveURL(/\/proyectos\/[a-z0-9-]+$/);
  });

  test('keeps the conversation for follow-up questions and can start over', async ({ page }) => {
    await asNewVisitor(page);
    const section = await openChat(page);
    const input = section.getByLabel('Tu pregunta');
    await input.fill('¿Qué hizo en telemetría?');
    await input.press('Enter');
    await expect(section.getByRole('log')).toContainText('Respuesta de prueba');
    await expect(section.getByRole('button', { name: 'Preguntar' })).toBeEnabled({
      timeout: 20_000,
    });

    await input.fill('¿Y con qué tecnologías?');
    await input.press('Enter');
    await expect(section.getByRole('log')).toContainText('¿Y con qué tecnologías?');
    await expect(section.getByRole('log').getByText('Asistente')).toHaveCount(2);

    await section.getByRole('button', { name: 'Nueva conversación' }).click();
    await expect(section.getByRole('log')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
      ),
    ).toEqual([]);
  });

  test('explains a question that is too short without sending it', async ({ page }) => {
    await asNewVisitor(page);
    let sent = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/chat')) sent += 1;
    });
    const section = await openChat(page);
    await section.getByLabel('Tu pregunta').fill('ok');
    await section.getByRole('button', { name: 'Preguntar' }).click();
    await expect(section.getByRole('status')).toHaveText(
      'Escribe una pregunta de entre 3 y 500 caracteres.',
    );
    expect(sent).toBe(0);
  });

  test('says when the visitor asks too fast', async ({ page }) => {
    await asNewVisitor(page);
    const section = await openChat(page);
    const input = section.getByLabel('Tu pregunta');
    const ask = section.getByRole('button', { name: 'Preguntar' });
    // Three questions per minute are allowed; the fourth is refused by the server.
    for (let index = 1; index <= 4; index += 1) {
      await expect(ask).toBeEnabled({ timeout: 20_000 });
      await input.fill(`Pregunta número ${String(index)}`);
      await ask.click();
      await expect(ask).toBeDisabled();
    }
    await expect(section.getByRole('status')).toHaveText(
      'Hiciste varias preguntas seguidas. Espera un minuto e inténtalo de nuevo.',
      { timeout: 20_000 },
    );
  });

  test('is accessible with a conversation on screen', async ({ page }) => {
    await asNewVisitor(page);
    const section = await openChat(page);
    await section.getByRole('button', { name: '¿Ha trabajado con Oracle?' }).click();
    await expect(section.getByRole('log').getByRole('link').first()).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#ask').withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test('speaks English on the English home page', async ({ page }) => {
    await asNewVisitor(page);
    await page.goto('/en#ask');
    const section = page.locator('#ask');
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Ask my portfolio');
    await expect(section.getByRole('button', { name: 'Ask', exact: true })).toBeEnabled({
      timeout: 20_000,
    });
    await section.getByRole('button', { name: 'Has he worked with Oracle?' }).click();
    await expect(section.getByRole('log').getByRole('link').first()).toHaveAttribute(
      'href',
      /^\/en\/projects\/[a-z0-9-]+$/,
    );
  });
});
