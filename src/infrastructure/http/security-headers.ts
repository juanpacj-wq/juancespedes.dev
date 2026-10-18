/*
 * Security headers shared by every response (ADR 0013). Two places apply them: the build step
 * scripts/security-headers.mjs writes them into dist/client/_headers for the static pages, and
 * src/middleware.ts adds them to the responses the Worker renders itself (the API).
 */

/** Third-party origins the pages use, and why. */
export const THIRD_PARTY_ORIGINS = {
  // Cloudflare Turnstile: the anti-spam challenge on the contact form (script and iframe).
  turnstile: 'https://challenges.cloudflare.com',
  // Cloudflare Web Analytics: the cookieless beacon script and the endpoint it reports to.
  analyticsScript: 'https://static.cloudflareinsights.com',
  analyticsEndpoint: 'https://cloudflareinsights.com',
  // Power BI "publish to web": the live replicas of the reports, framed only after a click.
  powerBi: 'https://app.powerbi.com',
} as const;

/** Headers that do not depend on the page. */
export const BASE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** API responses are data, never documents: they may load and embed nothing. */
export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";

/** Adds the security headers to a response the Worker produced, without overriding any it set. */
export const withSecurityHeaders = (response: Response): Response => {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!secured.headers.has(name)) secured.headers.set(name, value);
  }
  // HTML pages are static and get their policy, with script hashes, from _headers. Applying the
  // API policy to HTML would break pages in `astro dev`, where the middleware sees them too.
  const isHtml = (secured.headers.get('content-type') ?? '').includes('text/html');
  if (!isHtml && !secured.headers.has('Content-Security-Policy')) {
    secured.headers.set('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);
  }
  return secured;
};
