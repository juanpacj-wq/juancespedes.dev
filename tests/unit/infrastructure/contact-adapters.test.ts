import { describe, expect, it, vi } from 'vitest';

import type { SubmitContactRequest } from '../../../src/application/use-cases/submit-contact-request';
import { makeCloudflareEmailGateway } from '../../../src/infrastructure/email/cloudflare-email-gateway';
import { buildPlainTextEmail } from '../../../src/infrastructure/email/mime';
import {
  makeContactEndpoint,
  type ContactLogEntry,
} from '../../../src/infrastructure/http/contact-endpoint';
import { makeCloudflareRateLimiter } from '../../../src/infrastructure/security/cloudflare-rate-limiter';
import { makeTurnstileVerifier } from '../../../src/infrastructure/security/turnstile-verifier';

const decodeBody = (raw: string): string => {
  const body = raw.split('\r\n\r\n')[1]?.replace(/\r\n/g, '') ?? '';
  return new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)));
};

describe('buildPlainTextEmail', () => {
  const raw = buildPlainTextEmail({
    from: { name: 'juancespedes.dev', address: 'contacto@juancespedes.dev' },
    to: { name: 'Juan Céspedes', address: 'juan@example.com' },
    replyTo: { name: 'Ana\r\nBcc: victim@example.com', address: 'ana@empresa.com\nX: y' },
    subject: 'Contacto: Ñandú',
    body: 'Línea 1\nLínea 2',
    date: new Date('2026-10-12T15:00:00Z'),
    messageId: 'abc@juancespedes.dev',
  });
  const headers = raw.split('\r\n\r\n')[0] ?? '';

  it('writes the required headers', () => {
    expect(headers).toContain('Message-ID: <abc@juancespedes.dev>');
    expect(headers).toContain('Date: Mon, 12 Oct 2026 15:00:00 GMT');
    expect(headers).toContain('Content-Type: text/plain; charset=UTF-8');
  });

  it('keeps accents through RFC 2047 encoding and base64 bodies', () => {
    expect(headers).toMatch(/^Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/m);
    expect(decodeBody(raw)).toBe('Línea 1\r\nLínea 2');
  });

  it('cannot be tricked into new header lines', () => {
    expect(headers).not.toMatch(/^Bcc:/m);
    expect(headers).not.toMatch(/^X: y/m);
    expect(headers).toContain('<ana@empresa.com X: y>');
  });
});

describe('cloudflare email gateway', () => {
  it('sends to the owner with the visitor as Reply-To', async () => {
    const send = vi.fn(() => Promise.resolve());
    const gateway = makeCloudflareEmailGateway({
      transport: { send },
      fromAddress: 'contacto@juancespedes.dev',
      toAddress: 'juan@example.com',
      newId: () => 'id-1',
    });
    await gateway.deliver(
      { name: 'Ana', email: 'ana@empresa.com', message: 'Hola, necesito ayuda con un ETL.' },
      { locale: 'es', receivedAt: new Date('2026-10-12T15:00:00Z') },
    );

    const [from, to, raw] = send.mock.calls[0] as unknown as [string, string, string];
    expect([from, to]).toEqual(['contacto@juancespedes.dev', 'juan@example.com']);
    expect(raw).toContain('Message-ID: <id-1@juancespedes.dev>');
    expect(raw).toMatch(/^Reply-To: .* <ana@empresa\.com>$/m);
    expect(decodeBody(raw)).toContain('Hola, necesito ayuda con un ETL.');
  });
});

describe('turnstile verifier', () => {
  const answer = (body: unknown, ok = true) =>
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status: ok ? 200 : 500 })));

  it('accepts a successful verification and forwards the IP', async () => {
    const fetchMock = answer({ success: true });
    const verifier = makeTurnstileVerifier({ secret: 's', fetch: fetchMock });
    expect(await verifier.verify('token', '203.0.113.7')).toBe(true);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.body as URLSearchParams).get('remoteip')).toBe('203.0.113.7');
  });

  it.each([
    ['a failed check', answer({ success: false })],
    ['an HTTP error', answer({}, false)],
    ['a network error', vi.fn(() => Promise.reject(new Error('down')))],
    ['an unexpected body', answer('nope')],
  ])('fails closed on %s', async (_, fetchMock) => {
    const verifier = makeTurnstileVerifier({ secret: 's', fetch: fetchMock });
    expect(await verifier.verify('token', null)).toBe(false);
  });

  it('never calls out without a secret or a token', async () => {
    const fetchMock = answer({ success: true });
    expect(await makeTurnstileVerifier({ secret: '', fetch: fetchMock }).verify('t', null)).toBe(
      false,
    );
    expect(await makeTurnstileVerifier({ secret: 's', fetch: fetchMock }).verify(' ', null)).toBe(
      false,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('cloudflare rate limiter', () => {
  it('follows the binding answer', async () => {
    const limiter = makeCloudflareRateLimiter({ limit: () => Promise.resolve({ success: false }) });
    expect(await limiter.allow('ip')).toBe(false);
  });

  it('lets requests through if the binding itself fails', async () => {
    const limiter = makeCloudflareRateLimiter({ limit: () => Promise.reject(new Error('x')) });
    expect(await limiter.allow('ip')).toBe(true);
  });
});

describe('contact endpoint', () => {
  const run = async (
    result: Awaited<ReturnType<SubmitContactRequest>>,
    init: RequestInit & { json?: boolean } = {},
  ) => {
    const logs: ContactLogEntry[] = [];
    const submit = vi.fn<SubmitContactRequest>(() => Promise.resolve(result));
    const endpoint = makeContactEndpoint({
      submit,
      log: (entry) => logs.push(entry),
      newId: () => 'req-1',
    });
    const { json = true, ...rest } = init;
    const response = await endpoint(
      new Request('https://juancespedes.dev/api/contact', {
        method: 'POST',
        headers: json
          ? {
              'content-type': 'application/json',
              accept: 'application/json',
              'cf-connecting-ip': '203.0.113.7',
            }
          : { 'content-type': 'application/x-www-form-urlencoded' },
        body: json
          ? JSON.stringify({
              name: 'Ana',
              email: 'a@b.co',
              message: 'm',
              consent: 'true',
              locale: 'en',
              'cf-turnstile-response': 'tok',
              website: '',
            })
          : 'name=Ana&email=a%40b.co&message=m&consent=on&locale=es',
        ...rest,
      }),
    );
    return { response, submit, logs };
  };

  it('maps a JSON submission onto the use case and answers 200', async () => {
    const { response, submit, logs } = await run({ ok: true, value: undefined });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'sent', requestId: 'req-1' });
    expect(submit).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'a@b.co',
      message: 'm',
      consent: true,
      locale: 'en',
      humanToken: 'tok',
      honeypot: '',
      remoteIp: '203.0.113.7',
    });
    expect(logs).toEqual([
      { event: 'contact.submission', requestId: 'req-1', outcome: 'sent', locale: 'en' },
    ]);
  });

  it.each([
    [{ kind: 'invalid', issues: [{ field: 'email', code: 'invalid-email' }] }, 400],
    [{ kind: 'rate-limited' }, 429],
    [{ kind: 'verification-failed' }, 403],
    [{ kind: 'delivery-failed', cause: new Error('down') }, 502],
  ] as const)('answers %o with RFC 9457 problem details (%d)', async (error, status) => {
    const { response, logs } = await run({ ok: false, error });
    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toBe('application/problem+json');
    const problem = (await response.json()) as Record<string, unknown>;
    expect(problem).toMatchObject({
      status,
      instance: 'req-1',
      type: `https://juancespedes.dev/problems/${error.kind}`,
    });
    if (error.kind === 'invalid') expect(problem.errors).toEqual(error.issues);
    if (error.kind === 'delivery-failed') expect(logs[0]?.cause).toBe('Error: down');
  });

  it('redirects plain form posts back to the contact section', async () => {
    const sent = await run({ ok: true, value: undefined }, { json: false });
    expect(sent.response.status).toBe(303);
    expect(sent.response.headers.get('location')).toBe('/?contact=sent#contact');
    expect(sent.submit.mock.calls[0]?.[0]).toMatchObject({
      consent: true,
      locale: 'es',
      remoteIp: null,
    });

    const failed = await run({ ok: false, error: { kind: 'rate-limited' } }, { json: false });
    expect(failed.response.headers.get('location')).toBe('/?contact=error#contact');
  });

  it('rejects oversized and unsupported bodies before reading them', async () => {
    const big = await run(
      { ok: true, value: undefined },
      { headers: { 'content-length': '999999', accept: 'application/json' } },
    );
    expect(big.response.status).toBe(413);
    expect(big.submit).not.toHaveBeenCalled();

    const text = await run(
      { ok: true, value: undefined },
      { headers: { 'content-type': 'text/plain', accept: 'application/json' } },
    );
    expect(text.response.status).toBe(415);
  });

  it('treats a malformed JSON body as empty fields', async () => {
    const { submit } = await run({ ok: true, value: undefined }, { body: '{not json' });
    expect(submit.mock.calls[0]?.[0]).toMatchObject({ name: '', locale: 'es', consent: false });
  });
});
