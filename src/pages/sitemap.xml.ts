import type { APIRoute } from 'astro';

import { container } from '../composition/container';
import { DEFAULT_LOCALE } from '../domain/shared/locale';
import type { PageRoute } from '../ui/i18n/routes';
import { buildSitemap } from '../ui/seo/sitemap';

/** Generated at build time from the same route table the pages use. */
export const GET: APIRoute = async () => {
  // Project parity across languages is enforced by the content tests, so one locale lists them.
  const projects = await container.listProjects(DEFAULT_LOCALE);
  const routes: PageRoute[] = [
    { page: 'home' },
    ...projects.map((project) => ({ page: 'project' as const, slug: project.slug })),
    { page: 'privacy' },
  ];
  return new Response(buildSitemap(routes), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
