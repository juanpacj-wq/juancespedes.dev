import { expect, test } from '@playwright/test';

/*
 * The sitemap is the list of public pages. Every page in it must answer in its language, declare
 * itself canonical, list the same alternates as its translation, and carry an Open Graph card and
 * valid JSON-LD. A page added to one language only fails here.
 */

const SITE = 'https://juancespedes.dev';
const local = (url: string) => url.replace(SITE, '') || '/';

test.describe('bilingual site and SEO', () => {
  test('every sitemap page is complete and points at its translation', async ({
    page,
    request,
  }) => {
    // One test visits every page of the site (about 30): it needs more than the default 30 s.
    test.slow();
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
    const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => m[1] ?? '',
    );
    expect(locs.length).toBeGreaterThan(0);
    expect(locs.filter((loc) => loc.includes('/en')).length * 2).toBe(locs.length);

    const alternatesByPage = new Map<string, string>();
    for (const loc of locs) {
      const response = await page.goto(local(loc));
      expect(response?.status(), loc).toBe(200);

      const lang = await page.locator('html').getAttribute('lang');
      expect(lang, loc).toBe(loc.startsWith(`${SITE}/en`) ? 'en' : 'es');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', loc);

      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) =>
          links.map(
            (link) => `${link.getAttribute('hreflang') ?? ''}=${link.getAttribute('href') ?? ''}`,
          ),
        );
      expect(
        alternates.some((entry) => entry === `${lang ?? ''}=${loc}`),
        loc,
      ).toBe(true);
      expect(
        alternates.some((entry) => entry.startsWith('x-default=')),
        loc,
      ).toBe(true);
      alternatesByPage.set(loc, alternates.sort().join(' '));

      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(image, loc).toMatch(/^https:\/\/juancespedes\.dev\/og\/.+\.png$/);
      const card = await request.get(local(image ?? ''));
      expect(card.status(), image ?? '').toBe(200);
      expect(card.headers()['content-type']).toBe('image/png');

      for (const json of await page
        .locator('script[type="application/ld+json"]')
        .allTextContents()) {
        expect(JSON.parse(json)).toMatchObject({ '@context': 'https://schema.org' });
      }
    }

    // A page and its translation declare exactly the same set of alternates.
    for (const [loc, alternates] of alternatesByPage) {
      for (const entry of alternates.split(' ')) {
        const href = entry.slice(entry.indexOf('=') + 1);
        expect(alternatesByPage.get(href), `${loc} -> ${href}`).toBe(alternates);
      }
    }
  });

  test('the language switch keeps the reader on the same project', async ({ page }) => {
    await page.goto('/proyectos/plant-telemetry');
    await page.getByRole('link', { name: /Read this page in English/ }).click();
    await expect(page).toHaveURL(/\/en\/projects\/plant-telemetry$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Real-time power generation telemetry',
    );
    await expect(page.locator('main section[data-chapter] h2').first()).toHaveText('At a glance');

    await page.getByRole('link', { name: /Leer esta página en español/ }).click();
    await expect(page).toHaveURL(/\/proyectos\/plant-telemetry$/);
  });

  test('the English home page is complete and links within English', async ({ page }) => {
    // Reduced motion keeps the projects as a list, so a project link is clicked where it stands.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en');
    await expect(page.locator('main h2')).toHaveText([
      'Featured case studies',
      "Who's behind the work",
      'The tools I build with',
      'Business impact',
      'Services and prices',
      'Education and certifications',
      'Tell me what you need',
    ]);
    const esProjects = await page.request
      .get('/')
      .then(async (r) => (await r.text()).match(/<article[^>]*id="project-/g)?.length);
    await expect(page.locator('#projects article[id^="project-"]')).toHaveCount(esProjects ?? 0);

    await page.locator('#project-plant-telemetry').getByRole('link').click();
    await expect(page).toHaveURL(/\/en\/projects\/plant-telemetry$/);
    await page.getByRole('link', { name: 'All projects' }).click();
    await expect(page).toHaveURL(/\/en#projects$/);

    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy notice' }).click();
    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy notice');
  });

  test('robots.txt points crawlers at the sitemap', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Sitemap: https://juancespedes.dev/sitemap.xml');
  });

  test('the 404 page speaks both languages', async ({ page }) => {
    const response = await page.goto('/en/projects/missing');
    expect(response?.status()).toBe(404);
    await expect(page.locator('section[lang="en"]')).toContainText('This page does not exist');
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/en');
  });
});
