import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from 'react';

import {
  validateContactRequest,
  type ContactField,
  type ContactFieldIssue,
} from '../../domain/contact/contact-request';
import type { Locale } from '../../domain/shared/locale';
import type { Dictionary } from '../i18n/dictionary';
import { loadTurnstile } from './turnstile';

/*
 * Contact form island. Server-rendered as a plain HTML form (it posts to /api/contact even
 * without JavaScript); once hydrated it validates with the same domain rules as the server,
 * runs Cloudflare Turnstile and submits with fetch, announcing every state to screen readers.
 */

const FIELD_ORDER: readonly ContactField[] = ['name', 'email', 'message', 'consent'];

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'sent' }
  | { readonly kind: 'error'; readonly reason: keyof Dictionary['form']['errors'] };

export interface ContactFormProps {
  readonly locale: Locale;
  readonly endpoint: string;
  readonly siteKey: string;
  readonly privacyHref: string;
  readonly text: Dictionary['form'];
}

const subscribeToNothing = () => () => undefined;

const readField = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

export default function ContactForm({
  locale,
  endpoint,
  siteKey,
  privacyHref,
  text,
}: ContactFormProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [issues, setIssues] = useState<readonly ContactFieldIssue[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // Result of a no-JavaScript submission, passed back by the endpoint redirect (?contact=...).
  // Read as an external store so the server render and hydration agree.
  const redirectFlag = useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).get('contact'),
    () => null,
  );
  const shown: Status =
    status.kind !== 'idle'
      ? status
      : redirectFlag === 'sent'
        ? { kind: 'sent' }
        : redirectFlag === 'error'
          ? { kind: 'error', reason: 'delivery-failed' }
          : status;

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetRef.current || widgetId.current) return;
        widgetId.current = turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          language: locale,
          theme: 'auto',
          callback: (value: string) => {
            setToken(value);
          },
          'expired-callback': () => {
            setToken('');
          },
        });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: 'error', reason: 'network' });
      });
    return () => {
      cancelled = true;
    };
  }, [locale, siteKey]);

  const fieldError = (field: ContactField): string | null => {
    const issue = issues.find((candidate) => candidate.field === field);
    if (!issue) return null;
    const key = `${field}.${issue.code}` as keyof Dictionary['form']['fieldErrors'];
    return text.fieldErrors[key];
  };

  const focusFirstInvalid = (found: readonly ContactFieldIssue[]) => {
    const first = FIELD_ORDER.find((field) => found.some((issue) => issue.field === field));
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const resetWidget = () => {
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
    setToken('');
  };

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      name: readField(form, 'name'),
      email: readField(form, 'email'),
      message: readField(form, 'message'),
      consent: form.get('consent') === 'on',
    };

    const validation = validateContactRequest(values);
    if (!validation.ok) {
      setIssues(validation.error);
      setStatus({ kind: 'error', reason: 'invalid' });
      focusFirstInvalid(validation.error);
      return;
    }
    setIssues([]);
    setStatus({ kind: 'submitting' });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          ...values,
          consent: String(values.consent),
          locale,
          website: readField(form, 'website'),
          'cf-turnstile-response': token,
        }),
      });
      if (response.ok) {
        setStatus({ kind: 'sent' });
        formRef.current?.reset();
        resetWidget();
        return;
      }
      const problem = (await response.json().catch(() => ({}))) as { errors?: ContactFieldIssue[] };
      const reason =
        response.status === 400
          ? 'invalid'
          : response.status === 429
            ? 'rate-limited'
            : response.status === 403
              ? 'verification-failed'
              : 'delivery-failed';
      if (reason === 'invalid' && problem.errors) {
        setIssues(problem.errors);
        focusFirstInvalid(problem.errors);
      }
      setStatus({ kind: 'error', reason });
      resetWidget();
    } catch {
      setStatus({ kind: 'error', reason: 'network' });
    }
  };

  const inputClass =
    'mt-2 block w-full rounded-control border bg-surface px-4 py-3 text-ink placeholder:text-subtle transition-colors duration-150 focus:border-accent-ink focus:outline-none aria-invalid:border-accent-ink';
  const describedBy = (field: ContactField, hint?: string) =>
    [fieldError(field) ? `${id}-${field}-error` : null, hint ?? null].filter(Boolean).join(' ') ||
    undefined;

  const renderFieldError = (field: ContactField) => {
    const message = fieldError(field);
    return message ? (
      <p id={`${id}-${field}-error`} className="mt-2 text-small text-accent-ink">
        {message}
      </p>
    ) : null;
  };

  return (
    <form
      ref={formRef}
      method="post"
      action={endpoint}
      noValidate
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="grid gap-6"
      aria-describedby={`${id}-status`}
    >
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="text-small font-medium">
            {text.name}
          </label>
          <input
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            aria-invalid={fieldError('name') ? true : undefined}
            aria-describedby={describedBy('name')}
            className={`${inputClass} border-line-strong`}
          />
          {renderFieldError('name')}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="text-small font-medium">
            {text.email}
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
            aria-invalid={fieldError('email') ? true : undefined}
            aria-describedby={describedBy('email')}
            className={`${inputClass} border-line-strong`}
          />
          {renderFieldError('email')}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-message`} className="text-small font-medium">
          {text.message}
        </label>
        <p id={`${id}-message-hint`} className="mt-1 text-small text-muted">
          {text.messageHint}
        </p>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={6}
          required
          maxLength={5000}
          aria-invalid={fieldError('message') ? true : undefined}
          aria-describedby={describedBy('message', `${id}-message-hint`)}
          className={`${inputClass} resize-y border-line-strong`}
        />
        {renderFieldError('message')}
      </div>

      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className="flex items-start gap-3 text-small text-muted">
          <input
            name="consent"
            type="checkbox"
            required
            aria-invalid={fieldError('consent') ? true : undefined}
            aria-describedby={describedBy('consent')}
            className="mt-1 size-4 shrink-0 accent-accent"
          />
          <span>
            {text.consent}{' '}
            <a href={privacyHref} className="underline underline-offset-4 hover:text-accent-ink">
              {text.consentLink}
            </a>
            .
          </span>
        </label>
        {renderFieldError('consent')}
      </div>

      <div ref={widgetRef} className="min-h-16" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status.kind === 'submitting'}
          className="inline-flex min-h-12 items-center justify-center rounded-chip bg-accent px-6 font-medium text-on-accent shadow-bevel transition-[filter,scale] duration-500 ease-out hover:brightness-110 disabled:opacity-60 motion-safe:hover:scale-103 motion-safe:active:scale-97"
        >
          {status.kind === 'submitting' ? text.sending : text.submit}
        </button>
        <p id={`${id}-status`} role="status" aria-live="polite" className="text-small">
          {shown.kind === 'sent' && <span className="text-ink">{text.sent}</span>}
          {shown.kind === 'error' && (
            <span className="text-accent-ink">{text.errors[shown.reason]}</span>
          )}
        </p>
      </div>

      <noscript>
        <p className="text-small text-muted">{text.noScript}</p>
      </noscript>
    </form>
  );
}
