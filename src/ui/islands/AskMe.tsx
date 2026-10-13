import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';

import { CHAT_LIMITS, type ChatTurn } from '../../domain/chat/question';
import type { Locale } from '../../domain/shared/locale';
import { linkify } from '../chat/linkify';
import type { Dictionary } from '../i18n/dictionary';
import { loadTurnstile } from './turnstile';

/*
 * "Ask me" island (ADR 0017). Sends the question with a Turnstile token to /api/chat and renders
 * the answer as it streams (newline-delimited JSON). Answers are plain text; only paths of this
 * site become links. Nothing is stored: the conversation lives in this component's state.
 */

type ErrorCode = keyof Dictionary['chat']['errors'];

interface Turn extends ChatTurn {
  readonly note?: string;
}

export interface AskMeProps {
  readonly locale: Locale;
  readonly endpoint: string;
  readonly siteKey: string;
  readonly email: string;
  readonly text: Dictionary['chat'];
}

const KNOWN_ERRORS: readonly ErrorCode[] = [
  'disabled',
  'invalid',
  'rate-limited',
  'verification-failed',
  'visitor-limit',
  'daily-limit',
  'failed',
  'network',
];

const asErrorCode = (value: unknown): ErrorCode =>
  KNOWN_ERRORS.find((code) => code === value) ?? 'failed';

export default function AskMe({ locale, endpoint, siteKey, email, text }: AskMeProps) {
  const id = useId();
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !widgetRef.current || widgetId.current) return;
        widgetId.current = turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          language: locale,
          theme: 'auto',
          appearance: 'interaction-only',
          callback: (value: string) => {
            setToken(value);
          },
          'expired-callback': () => {
            setToken('');
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError('network');
      });
    return () => {
      cancelled = true;
    };
  }, [locale, siteKey]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  const freshToken = () => {
    // A Turnstile token is valid for one verification: ask for a new one after every question.
    setToken('');
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  };

  const updateAnswer = (change: (answer: Turn) => Turn) => {
    setTurns((current) => {
      const last = current.at(-1);
      return last?.role === 'assistant' ? [...current.slice(0, -1), change(last)] : current;
    });
  };

  const ask = async (asked: string) => {
    const trimmed = asked.trim();
    if (pending || !token) return;
    if (trimmed.length < CHAT_LIMITS.question.min || trimmed.length > CHAT_LIMITS.question.max) {
      setError('invalid');
      return;
    }
    const history = turns.map(({ role, text: turnText }) => ({ role, text: turnText }));
    setError(null);
    setPending(true);
    setQuestion('');
    setTurns((current) => [
      ...current,
      { role: 'user', text: trimmed },
      { role: 'assistant', text: '' },
    ]);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ question: trimmed, history, locale, token }),
      });
      if (!response.ok || !response.body) {
        const problem = (await response.json().catch(() => ({}))) as { code?: unknown };
        setTurns((current) => current.slice(0, -2));
        setQuestion(trimmed);
        setError(asErrorCode(problem.code));
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as { type: string; text?: string; outcome?: string };
          if (event.type === 'text' && event.text) {
            const chunk = event.text;
            updateAnswer((answer) => ({ ...answer, text: answer.text + chunk }));
          } else if (event.type === 'done' && event.outcome === 'refused') {
            updateAnswer((answer) => ({ ...answer, text: text.refused }));
          } else if (event.type === 'done' && event.outcome === 'truncated') {
            updateAnswer((answer) => ({ ...answer, note: text.truncated }));
          } else if (event.type === 'error') {
            setError('failed');
          }
        }
      }
    } catch {
      setError('network');
    } finally {
      setPending(false);
      freshToken();
    }
  };

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  const examples = [text.example1, text.example2, text.example3];
  const errorText = error ? text.errors[error].replace('{email}', email) : null;
  const status = pending ? text.thinking : !token ? text.verifying : '';

  return (
    <div className="flex flex-col gap-5">
      {turns.length > 0 ? (
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label={text.title}
          className="flex max-h-[28rem] flex-col gap-4 overflow-y-auto"
        >
          {turns.map((turn, index) => (
            <div
              key={`${String(index)}-${turn.role}`}
              className={
                turn.role === 'user'
                  ? 'self-end rounded-card bg-surface-raised px-4 py-3 text-ink'
                  : 'flex flex-col gap-1 text-muted'
              }
            >
              <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
                {turn.role === 'user' ? text.you : text.assistant}
              </p>
              <p className="whitespace-pre-line">
                {turn.role === 'assistant' && turn.text === '' && pending
                  ? text.thinking
                  : linkify(turn.text).map((part, partIndex) =>
                      part.kind === 'link' ? (
                        <a
                          key={partIndex}
                          href={part.href}
                          className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent-ink"
                        >
                          {part.label}
                        </a>
                      ) : (
                        <span key={partIndex}>{part.text}</span>
                      ),
                    )}
              </p>
              {turn.note && <p className="text-small text-subtle">{turn.note}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-eyebrow tracking-widest text-subtle uppercase">
            {text.suggestions}
          </p>
          <ul className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  disabled={pending || !token}
                  onClick={() => {
                    void ask(example);
                  }}
                  className="min-h-11 rounded-chip border border-line-strong px-4 text-small text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor={`${id}-question`} className="text-small font-medium text-ink">
          {text.label}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={`${id}-question`}
            name="question"
            value={question}
            maxLength={CHAT_LIMITS.question.max}
            placeholder={text.placeholder}
            autoComplete="off"
            onChange={(event) => {
              setQuestion(event.target.value);
            }}
            className="min-h-12 flex-1 rounded-control border border-line-strong bg-canvas px-4 text-ink placeholder:text-subtle focus:border-accent-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !token}
            className="min-h-12 rounded-control bg-accent px-6 font-medium text-on-accent transition-opacity disabled:opacity-60"
          >
            {text.submit}
          </button>
        </div>
        <div ref={widgetRef} />
        <p role="status" className="min-h-5 text-small text-subtle">
          {errorText ?? status}
        </p>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-small text-subtle">{text.disclaimer}</p>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setTurns([]);
              setError(null);
            }}
            className="min-h-11 text-small text-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            {text.clear}
          </button>
        )}
      </div>
    </div>
  );
}
