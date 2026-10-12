import type { APIRoute } from 'astro';

import { handleContactRequest } from '../../composition/contact';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleContactRequest(request);
