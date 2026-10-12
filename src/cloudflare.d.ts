/*
 * The slice of the Cloudflare Workers runtime this site uses, typed by hand. Generating the full
 * runtime types (`wrangler types`) adds ~600 KB of globals that clash with the DOM types Astro
 * needs; the bindings are few and stable, so an explicit contract is clearer.
 * Keep in sync with wrangler.jsonc (`send_email`, `ratelimits`).
 */

declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
    readonly from: string;
    readonly to: string;
  }
}

declare module 'cloudflare:workers' {
  import type { EmailMessage } from 'cloudflare:email';

  interface SendEmailBinding {
    send(message: EmailMessage): Promise<void>;
  }

  interface RateLimitBinding {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  }

  export const env: {
    readonly CONTACT_EMAIL: SendEmailBinding;
    readonly CONTACT_RATE_LIMITER: RateLimitBinding;
    readonly CLIENT_ERROR_RATE_LIMITER: RateLimitBinding;
  };
}
