import type { APIRoute } from 'astro';

import { handleClientErrorReport } from '../../composition/client-errors';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleClientErrorReport(request);
