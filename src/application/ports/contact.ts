import type { ContactRequest } from '../../domain/contact/contact-request';
import type { Locale } from '../../domain/shared/locale';

export interface ContactMetadata {
  readonly locale: Locale;
  readonly receivedAt: Date;
}

/** Delivers a validated contact request to the owner (email, ticket, chat...). */
export interface ContactGateway {
  deliver(request: ContactRequest, metadata: ContactMetadata): Promise<void>;
}

/** Proves the sender is a person (e.g. a CAPTCHA token check). */
export interface HumanVerifier {
  verify(token: string, remoteIp: string | null): Promise<boolean>;
}

/** Answers whether a caller identified by `key` may perform one more attempt now. */
export interface RateLimiter {
  allow(key: string): Promise<boolean>;
}
