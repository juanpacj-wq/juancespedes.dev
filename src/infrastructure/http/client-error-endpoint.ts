import type { RateLimiter } from '../../application/ports/contact';

/*
 * Receives JavaScript errors from visitors' browsers and writes them to the Worker log, where
 * Workers Logs keeps them (ADR 0013). It replaces a third-party error tracker: the payload is
 * the error itself and the page path, never anything about the visitor. The endpoint always
 * answers 204, so a broken report can never break a page.
 */

const MAX_BODY_BYTES = 4 * 1024;
const MAX_TEXT = 500;

export interface ClientErrorReport {
  readonly kind: 'error' | 'unhandledrejection';
  readonly message: string;
  /** Script path on this site; other origins (extensions, injected scripts) are dropped. */
  readonly source: string | null;
  readonly line: number | null;
  readonly column: number | null;
  readonly page: string;
  readonly release: string;
}

export interface ClientErrorLogEntry extends ClientErrorReport {
  readonly level: 'error';
  readonly event: 'client.error';
}

export interface ClientErrorEndpointDeps {
  readonly rateLimiter: RateLimiter;
  readonly log: (entry: ClientErrorLogEntry) => void;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, MAX_TEXT) : null;

const position = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/** Keeps only a path on this site: no query string, no fragment, no other origin. */
const sitePath = (value: unknown, origin: string): string | null => {
  const raw = text(value);
  if (raw === null) return null;
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? url.pathname : null;
  } catch {
    return null;
  }
};

/** Validates an untrusted report. Returns null for anything that is not a usable error. */
export const parseClientErrorReport = (body: unknown, origin: string): ClientErrorReport | null => {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Partial<Record<keyof ClientErrorReport, unknown>>;
  const kind = record.kind;
  const message = text(record.message);
  const page = sitePath(record.page, origin);
  if ((kind !== 'error' && kind !== 'unhandledrejection') || message === null || page === null) {
    return null;
  }
  return {
    kind,
    message,
    source: sitePath(record.source, origin),
    line: position(record.line),
    column: position(record.column),
    page,
    release: text(record.release)?.slice(0, 64) ?? 'unknown',
  };
};

const noContent = () =>
  new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export const makeClientErrorEndpoint =
  ({ rateLimiter, log }: ClientErrorEndpointDeps) =>
  async (request: Request): Promise<Response> => {
    const length = Number(request.headers.get('content-length') ?? '0');
    if (length > MAX_BODY_BYTES) return noContent();

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (!(await rateLimiter.allow(`client-error:${ip}`))) return noContent();

    let body: unknown;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return noContent();
      body = JSON.parse(raw);
    } catch {
      return noContent();
    }

    // Reports are only accepted about pages of the host that received them (production or preview).
    const report = parseClientErrorReport(body, new URL(request.url).origin);
    if (report) log({ level: 'error', event: 'client.error', ...report });
    return noContent();
  };
