import type { RateLimiter } from '../../application/ports/contact';

/** Shape of a Workers Rate Limiting binding (`ratelimits` in wrangler.jsonc). */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Wraps the Workers rate limiting binding. If the binding itself errors, the request is allowed:
 * a limiter outage must not take the contact form down (CAPTCHA still protects it).
 */
export const makeCloudflareRateLimiter = (binding: RateLimitBinding): RateLimiter => ({
  async allow(key) {
    try {
      return (await binding.limit({ key })).success;
    } catch {
      return true;
    }
  },
});
