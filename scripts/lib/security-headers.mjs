// Security headers for every response (ADR 0013). Static pages are served by Cloudflare's asset
// layer without running the Worker, so their headers live in the `_headers` file written after
// the build; the Worker's own responses get the same set from src/middleware.ts.
//
// The content security policy allows no inline script except the exact ones Astro emitted: the
// build step hashes each of them (SHA-256) and lists the hashes in `script-src`.
import { createHash } from 'node:crypto';

import {
  BASE_SECURITY_HEADERS,
  THIRD_PARTY_ORIGINS,
} from '../../src/infrastructure/http/security-headers.ts';

const ORIGINS = THIRD_PARTY_ORIGINS;
export const BASE_HEADERS = BASE_SECURITY_HEADERS;

/**
 * Inline scripts in an HTML document that the browser would execute. JSON-LD and other data
 * blocks are not executed, so CSP does not apply to them.
 * @param {string} html
 * @returns {string[]} the exact text of each script
 */
export const inlineScripts = (html) =>
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)]
    .filter(([, attributes = '']) => !/\bsrc\s*=/i.test(attributes))
    .filter(([, attributes = '']) => {
      const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attributes)?.[1]?.toLowerCase();
      return type === undefined || type === 'module' || type === 'text/javascript';
    })
    .map(([, , body = '']) => body)
    .filter((body) => body.trim() !== '');

/** @param {string} script */
export const scriptHash = (script) =>
  `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`;

/**
 * @param {readonly string[]} hashes CSP source expressions for the allowed inline scripts
 * @returns {string}
 */
export const contentSecurityPolicy = (hashes) =>
  [
    "default-src 'self'",
    `script-src 'self' ${[...new Set(hashes)].sort().join(' ')} ${ORIGINS.turnstile} ${ORIGINS.analyticsScript}`
      .replace(/\s+/g, ' ')
      .trim(),
    // Astro's scoped styles and a few style attributes are inline; styles cannot run code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${ORIGINS.analyticsEndpoint}`,
    `frame-src ${ORIGINS.turnstile} ${ORIGINS.powerBi}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // No upgrade-insecure-requests: every URL is already https (HSTS, preloaded .dev TLD), and
    // WebKit applies it to http://localhost too, which breaks local previews and tests.
  ].join('; ');

/**
 * Appends a rule for every path to an existing `_headers` file, keeping its rules.
 * @param {string} existing current file content (may be empty)
 * @param {Record<string, string>} headers
 */
export const withGlobalHeaders = (existing, headers) => {
  const block = ['/*', ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`)];
  return `${[existing.trimEnd(), block.join('\n')].filter(Boolean).join('\n\n')}\n`;
};
