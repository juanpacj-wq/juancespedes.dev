import { env } from 'cloudflare:workers';

import { makeClientErrorEndpoint } from '../infrastructure/http/client-error-endpoint';
import { makeCloudflareRateLimiter } from '../infrastructure/security/cloudflare-rate-limiter';

/** Composition for the browser error reports endpoint (ADR 0013). */
export const handleClientErrorReport = makeClientErrorEndpoint({
  rateLimiter: makeCloudflareRateLimiter(env.CLIENT_ERROR_RATE_LIMITER),
  // console.error lines are kept by Workers Logs with level "error", searchable in the dashboard.
  log: (entry) => {
    console.error(JSON.stringify(entry));
  },
});
