import type {
  ContactSubmissionError,
  SubmitContactRequest,
} from '../../application/use-cases/submit-contact-request';
import { DEFAULT_LOCALE, isLocale } from '../../domain/shared/locale';

/*
 * HTTP delivery for the contact use case. Works with and without JavaScript:
 * - fetch with `Accept: application/json` gets JSON, errors as RFC 9457 problem details;
 * - a plain HTML form post gets a 303 redirect back to the contact section with a status flag.
 */

const MAX_BODY_BYTES = 16 * 1024;
export const HUMAN_TOKEN_FIELD = 'cf-turnstile-response';
export const HONEYPOT_FIELD = 'website';

type Outcome = 'sent' | ContactSubmissionError['kind'] | 'too-large' | 'unsupported';

const PROBLEMS: Record<Exclude<Outcome, 'sent'>, { status: number; title: string }> = {
  invalid: { status: 400, title: 'The contact request has invalid fields' },
  'rate-limited': { status: 429, title: 'Too many contact requests, try again in a minute' },
  'verification-failed': { status: 403, title: 'Human verification failed' },
  'delivery-failed': { status: 502, title: 'The message could not be delivered' },
  'too-large': { status: 413, title: 'The request body is too large' },
  unsupported: { status: 415, title: 'Unsupported content type' },
};

export interface ContactLogEntry {
  readonly event: 'contact.submission';
  readonly requestId: string;
  readonly outcome: Outcome;
  readonly locale: string;
  readonly cause?: string;
}

export interface ContactEndpointDeps {
  readonly submit: SubmitContactRequest;
  readonly log: (entry: ContactLogEntry) => void;
  readonly newId: () => string;
}

const readFields = async (request: Request): Promise<Record<string, string> | null> => {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const json: unknown = await request.json();
    if (typeof json !== 'object' || json === null) return {};
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : String(value),
      ]),
    );
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData();
    return Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : '']),
    );
  }
  return null;
};

export const makeContactEndpoint =
  ({ submit, log, newId }: ContactEndpointDeps) =>
  async (request: Request): Promise<Response> => {
    const requestId = newId();
    const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

    const respond = (outcome: Outcome, locale: string, extra: Record<string, unknown> = {}) => {
      if (!wantsJson) {
        const home = locale === 'en' ? '/en' : '/';
        const flag = outcome === 'sent' ? 'sent' : 'error';
        return new Response(null, {
          status: 303,
          headers: { location: `${home}?contact=${flag}#contact` },
        });
      }
      if (outcome === 'sent') {
        return Response.json(
          { status: 'sent', requestId },
          { headers: { 'cache-control': 'no-store' } },
        );
      }
      const { status, title } = PROBLEMS[outcome];
      return Response.json(
        {
          type: `https://juancespedes.dev/problems/${outcome}`,
          title,
          status,
          instance: requestId,
          ...extra,
        },
        {
          status,
          headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' },
        },
      );
    };

    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BODY_BYTES) {
      log({ event: 'contact.submission', requestId, outcome: 'too-large', locale: DEFAULT_LOCALE });
      return respond('too-large', DEFAULT_LOCALE);
    }

    let fields: Record<string, string> | null;
    try {
      fields = await readFields(request);
    } catch {
      fields = {};
    }
    if (fields === null) {
      log({
        event: 'contact.submission',
        requestId,
        outcome: 'unsupported',
        locale: DEFAULT_LOCALE,
      });
      return respond('unsupported', DEFAULT_LOCALE);
    }

    const locale = isLocale(fields.locale) ? fields.locale : DEFAULT_LOCALE;
    const result = await submit({
      name: fields.name ?? '',
      email: fields.email ?? '',
      message: fields.message ?? '',
      consent: ['on', 'true', '1'].includes(fields.consent ?? ''),
      locale,
      humanToken: fields[HUMAN_TOKEN_FIELD] ?? '',
      honeypot: fields[HONEYPOT_FIELD] ?? '',
      remoteIp: request.headers.get('cf-connecting-ip'),
    });

    if (result.ok) {
      log({ event: 'contact.submission', requestId, outcome: 'sent', locale });
      return respond('sent', locale);
    }

    const error = result.error;
    log({
      event: 'contact.submission',
      requestId,
      outcome: error.kind,
      locale,
      ...(error.kind === 'delivery-failed' ? { cause: String(error.cause) } : {}),
    });
    return respond(error.kind, locale, error.kind === 'invalid' ? { errors: error.issues } : {});
  };
