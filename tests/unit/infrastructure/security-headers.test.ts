import { describe, expect, it } from 'vitest';

import {
  contentSecurityPolicy,
  inlineScripts,
  scriptHash,
  withGlobalHeaders,
} from '../../../scripts/lib/security-headers.mjs';
import {
  API_CONTENT_SECURITY_POLICY,
  BASE_SECURITY_HEADERS,
  withSecurityHeaders,
} from '../../../src/infrastructure/http/security-headers';

describe('inline script hashing', () => {
  const html = [
    '<script>console.log(1)</script>',
    '<script type="module">import "x"</script>',
    '<script src="/a.js"></script>',
    '<script type="application/ld+json">{"a":1}</script>',
    '<script>   </script>',
  ].join('');

  it('finds only the scripts a browser would execute inline', () => {
    expect(inlineScripts(html)).toEqual(['console.log(1)', 'import "x"']);
  });

  it('hashes with SHA-256 in CSP source syntax', () => {
    // Known value: printf 'console.log(1)' | openssl dgst -sha256 -binary | base64
    expect(scriptHash('console.log(1)')).toBe(
      "'sha256-CihokcEcBW4atb/CW/XWsvWwbTjqwQlE9nj9ii5ww5M='",
    );
  });
});

describe('content security policy', () => {
  const csp = contentSecurityPolicy(["'sha256-b'", "'sha256-a'", "'sha256-a'"]);

  it('allows exactly the hashed inline scripts, deduplicated and sorted', () => {
    expect(csp).toContain(
      "script-src 'self' 'sha256-a' 'sha256-b' https://challenges.cloudflare.com",
    );
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('forbids framing, plugins and foreign form targets', () => {
    for (const directive of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
  });

  it('appends a rule for every path to the existing _headers file', () => {
    const existing = '/_astro/*\n  Cache-Control: immutable\n';
    expect(withGlobalHeaders(existing, { 'X-Test': '1' })).toBe(
      '/_astro/*\n  Cache-Control: immutable\n\n/*\n  X-Test: 1\n',
    );
    expect(withGlobalHeaders('', { 'X-Test': '1' })).toBe('/*\n  X-Test: 1\n');
  });
});

describe('Worker responses', () => {
  it('get the base headers and a locked-down policy for data', () => {
    const secured = withSecurityHeaders(Response.json({ ok: true }));
    for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
      expect(secured.headers.get(name)).toBe(value);
    }
    expect(secured.headers.get('content-security-policy')).toBe(API_CONTENT_SECURITY_POLICY);
  });

  it('keep headers they already set and leave HTML policies to _headers', async () => {
    const html = withSecurityHeaders(
      new Response('<p>hi</p>', {
        status: 404,
        headers: { 'content-type': 'text/html', 'x-frame-options': 'SAMEORIGIN' },
      }),
    );
    expect(html.status).toBe(404);
    expect(html.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(html.headers.get('content-security-policy')).toBeNull();
    expect(await html.text()).toBe('<p>hi</p>');
  });
});
