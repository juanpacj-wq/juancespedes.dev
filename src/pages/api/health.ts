import type { APIRoute } from 'astro';

import { container } from '../../composition/container';

export const prerender = false;

export const GET: APIRoute = () =>
  Response.json(container.getHealthStatus(), {
    headers: { 'cache-control': 'no-store' },
  });
