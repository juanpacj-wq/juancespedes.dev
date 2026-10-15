import type { APIRoute } from 'astro';

import { techLogoSprite } from '../ui/icons/tech-logos';

/** The technology logos as one sprite, generated at build time (CapabilitiesSection.astro). */
export const GET: APIRoute = () =>
  new Response(techLogoSprite(), { headers: { 'Content-Type': 'image/svg+xml' } });
