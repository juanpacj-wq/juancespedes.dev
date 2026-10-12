import type { HumanVerifier } from '../../application/ports/contact';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifierConfig {
  readonly secret: string;
  readonly fetch: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * Validates a Cloudflare Turnstile token server-side. Fails closed: a timeout, a network error or
 * an unexpected answer all count as "not verified".
 */
export const makeTurnstileVerifier = ({
  secret,
  fetch: doFetch,
  timeoutMs = 5000,
}: TurnstileVerifierConfig): HumanVerifier => ({
  async verify(token, remoteIp) {
    if (secret.trim() === '' || token.trim() === '') return false;
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    try {
      const response = await doFetch(SITEVERIFY_URL, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) return false;
      const result: unknown = await response.json();
      return (
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        result.success === true
      );
    } catch {
      return false;
    }
  },
});
