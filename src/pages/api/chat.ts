import type { APIRoute } from 'astro';

import { handleChatRequest } from '../../composition/chat';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleChatRequest(request);
