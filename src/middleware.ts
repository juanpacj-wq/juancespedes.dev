import { defineMiddleware } from 'astro:middleware';

import { withSecurityHeaders } from './infrastructure/http/security-headers';

/**
 * Adds the security headers to every response the Worker renders (the API). Static pages never
 * reach the Worker in production; they get the same headers from dist/client/_headers.
 */
export const onRequest = defineMiddleware(async (_context, next) =>
  withSecurityHeaders(await next()),
);
