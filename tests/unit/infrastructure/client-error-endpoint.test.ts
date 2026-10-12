import { describe, expect, it, vi } from 'vitest';

import {
  makeClientErrorEndpoint,
  parseClientErrorReport,
  type ClientErrorLogEntry,
} from '../../../src/infrastructure/http/client-error-endpoint';

const ORIGIN = 'https://juancespedes.dev';

const valid = {
  kind: 'error',
  message: 'x is not defined',
  source: `${ORIGIN}/_astro/client.js?v=1`,
  line: 12,
  column: 4,
  page: '/proyectos/plant-telemetry',
  release: 'abc123',
};

describe('parseClientErrorReport', () => {
  it('keeps the error and strips query strings from paths', () => {
    expect(parseClientErrorReport(valid, ORIGIN)).toEqual({
      kind: 'error',
      message: 'x is not defined',
      source: '/_astro/client.js',
      line: 12,
      column: 4,
      page: '/proyectos/plant-telemetry',
      release: 'abc123',
    });
  });

  it('drops sources from other origins, such as browser extensions', () => {
    const report = parseClientErrorReport(
      { ...valid, source: 'chrome-extension://abc/script.js' },
      ORIGIN,
    );
    expect(report?.source).toBeNull();
  });

  it('truncates long messages and defaults bad positions and release', () => {
    const report = parseClientErrorReport(
      { ...valid, message: 'a'.repeat(2000), line: -1, column: 1.5, release: 5 },
      ORIGIN,
    );
    expect(report?.message).toHaveLength(500);
    expect([report?.line, report?.column, report?.release]).toEqual([null, null, 'unknown']);
  });

  it.each([
    ['not an object', 'boom'],
    ['null', null],
    ['an unknown kind', { ...valid, kind: 'warning' }],
    ['an empty message', { ...valid, message: '  ' }],
    ['a page on another site', { ...valid, page: 'https://evil.example/x' }],
    ['a malformed page', { ...valid, page: 'http://[' }],
  ])('rejects %s', (_, body) => {
    expect(parseClientErrorReport(body, ORIGIN)).toBeNull();
  });
});

describe('client error endpoint', () => {
  const setup = (allowed = true) => {
    const log = vi.fn<(entry: ClientErrorLogEntry) => void>();
    const allow = vi.fn(() => Promise.resolve(allowed));
    const handle = makeClientErrorEndpoint({ rateLimiter: { allow }, log });
    return { log, allow, handle };
  };
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request(`${ORIGIN}/api/client-errors`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.9',
        ...headers,
      },
      body,
    });

  it('logs a valid report as an error and answers 204', async () => {
    const { log, allow, handle } = setup();
    const response = await handle(post(JSON.stringify(valid)));
    expect(response.status).toBe(204);
    expect(allow).toHaveBeenCalledWith('client-error:203.0.113.9');
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error', event: 'client.error', page: valid.page }),
    );
  });

  it('answers 204 without logging when rate limited, malformed, invalid or too large', async () => {
    const limited = setup(false);
    await limited.handle(post(JSON.stringify(valid)));
    expect(limited.log).not.toHaveBeenCalled();

    const { log, handle } = setup();
    for (const request of [
      post('{not json'),
      post(JSON.stringify({ kind: 'nope' })),
      post(JSON.stringify(valid), { 'content-length': '999999' }),
      post(JSON.stringify({ ...valid, message: 'x'.repeat(5000) }), { 'content-length': '10' }),
    ]) {
      expect((await handle(request)).status).toBe(204);
    }
    expect(log).not.toHaveBeenCalled();
  });

  it('uses an unknown key when the client IP header is missing', async () => {
    const { allow, handle } = setup();
    await handle(
      new Request(`${ORIGIN}/api/client-errors`, { method: 'POST', body: JSON.stringify(valid) }),
    );
    expect(allow).toHaveBeenCalledWith('client-error:unknown');
  });
});
