import type { ChatEvent, ChatUsage } from '../../application/ports/chat';
import type {
  AnswerPortfolioQuestion,
  AnswerQuestionError,
} from '../../application/use-cases/answer-portfolio-question';
import { DEFAULT_LOCALE, isLocale } from '../../domain/shared/locale';

/*
 * HTTP delivery for "Ask me" (ADR 0017). The browser posts JSON; the answer streams back as
 * newline-delimited JSON (`{"type":"text"}` lines, then one `{"type":"done"}` line), so text
 * appears as it is written. Errors before the answer are RFC 9457 problem details with a `code`
 * the interface translates. Logs carry token counts and timing, never the question or answer.
 */

const MAX_BODY_BYTES = 16 * 1024;

export type ChatProblemCode = AnswerQuestionError['kind'] | 'too-large' | 'unsupported';

const STATUS: Record<ChatProblemCode, number> = {
  disabled: 503,
  invalid: 400,
  'rate-limited': 429,
  'verification-failed': 403,
  'visitor-limit': 429,
  'daily-limit': 429,
  'too-large': 413,
  unsupported: 415,
};

export interface ChatLogEntry {
  readonly event: 'chat.answer';
  readonly requestId: string;
  readonly locale: string;
  readonly outcome: ChatProblemCode | 'answered' | 'truncated' | 'refused' | 'failed';
  readonly durationMs: number;
  readonly usage?: ChatUsage;
}

export interface ChatEndpointDeps {
  readonly answer: AnswerPortfolioQuestion;
  readonly visitorKeyFor: (ip: string) => Promise<string>;
  readonly log: (entry: ChatLogEntry) => void;
  readonly newId: () => string;
  readonly now: () => number;
}

const problem = (code: ChatProblemCode, requestId: string, detail?: string) =>
  Response.json(
    { type: 'about:blank', title: code, status: STATUS[code], code, requestId, detail },
    {
      status: STATUS[code],
      headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' },
    },
  );

const field = (body: Record<string, unknown>, name: string): string =>
  typeof body[name] === 'string' ? body[name] : '';

export const makeChatEndpoint =
  ({ answer, visitorKeyFor, log, newId, now }: ChatEndpointDeps) =>
  async (request: Request): Promise<Response> => {
    const requestId = newId();
    const started = now();
    const done = (entry: Omit<ChatLogEntry, 'event' | 'requestId' | 'durationMs'>) => {
      log({ event: 'chat.answer', requestId, durationMs: now() - started, ...entry });
    };

    if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
      done({ locale: DEFAULT_LOCALE, outcome: 'unsupported' });
      return problem('unsupported', requestId);
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      done({ locale: DEFAULT_LOCALE, outcome: 'too-large' });
      return problem('too-large', requestId);
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      body =
        typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      body = {};
    }

    const requestedLocale = field(body, 'locale');
    const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
    const ip = request.headers.get('cf-connecting-ip');
    const result = await answer({
      locale,
      question: body.question,
      history: body.history,
      humanToken: field(body, 'token'),
      remoteIp: ip,
      visitorKey: await visitorKeyFor(ip ?? 'unknown'),
    });
    if (!result.ok) {
      done({ locale, outcome: result.error.kind });
      return problem(
        result.error.kind,
        requestId,
        result.error.kind === 'invalid' ? result.error.issue : undefined,
      );
    }

    const encoder = new TextEncoder();
    const events: AsyncIterable<ChatEvent> = result.value;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (line: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        };
        try {
          for await (const event of events) {
            if (event.type === 'text') {
              send({ type: 'text', text: event.text });
            } else {
              send({ type: 'done', outcome: event.outcome });
              done({ locale, outcome: event.outcome, usage: event.usage });
            }
          }
        } catch {
          send({ type: 'error' });
          done({ locale, outcome: 'failed' });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
        'x-request-id': requestId,
      },
    });
  };
