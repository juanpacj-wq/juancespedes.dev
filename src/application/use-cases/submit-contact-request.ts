import {
  validateContactRequest,
  type ContactFieldIssue,
  type ContactRequestInput,
} from '../../domain/contact/contact-request';
import type { Locale } from '../../domain/shared/locale';
import { err, ok, type Result } from '../../domain/shared/result';
import type { Clock } from '../ports/clock';
import type { ContactGateway, HumanVerifier, RateLimiter } from '../ports/contact';

export interface ContactSubmission extends ContactRequestInput {
  readonly locale: Locale;
  /** CAPTCHA token produced by the browser widget. */
  readonly humanToken: string;
  /** Hidden field that people never fill in; bots usually do. */
  readonly honeypot: string;
  readonly remoteIp: string | null;
}

export type ContactSubmissionError =
  | { readonly kind: 'invalid'; readonly issues: readonly ContactFieldIssue[] }
  | { readonly kind: 'rate-limited' }
  | { readonly kind: 'verification-failed' }
  | { readonly kind: 'delivery-failed'; readonly cause: unknown };

export interface SubmitContactRequestDeps {
  readonly gateway: ContactGateway;
  readonly verifier: HumanVerifier;
  readonly rateLimiter: RateLimiter;
  readonly clock: Clock;
}

/**
 * Order matters: cheap checks first, the paid or slow ones (CAPTCHA verification, delivery)
 * last. A filled honeypot gets a fake success so bots learn nothing.
 */
export const makeSubmitContactRequest =
  ({ gateway, verifier, rateLimiter, clock }: SubmitContactRequestDeps) =>
  async (submission: ContactSubmission): Promise<Result<void, ContactSubmissionError>> => {
    if (submission.honeypot.trim() !== '') return ok(undefined);

    if (!(await rateLimiter.allow(submission.remoteIp ?? 'unknown'))) {
      return err({ kind: 'rate-limited' });
    }

    const request = validateContactRequest(submission);
    if (!request.ok) return err({ kind: 'invalid', issues: request.error });

    if (!(await verifier.verify(submission.humanToken, submission.remoteIp))) {
      return err({ kind: 'verification-failed' });
    }

    try {
      await gateway.deliver(request.value, {
        locale: submission.locale,
        receivedAt: clock.now(),
      });
      return ok(undefined);
    } catch (cause) {
      return err({ kind: 'delivery-failed', cause });
    }
  };

export type SubmitContactRequest = ReturnType<typeof makeSubmitContactRequest>;
