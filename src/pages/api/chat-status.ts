import type { APIRoute } from 'astro';

import { handleChatStatusRequest } from '../../composition/chat';

export const prerender = false;

export const GET: APIRoute = ({ request }) => handleChatStatusRequest(request);
