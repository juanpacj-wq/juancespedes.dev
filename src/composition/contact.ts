import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { EmailMessage } from 'cloudflare:email';
import { env } from 'cloudflare:workers';

import { makeSubmitContactRequest } from '../application/use-cases/submit-contact-request';
import { makeCloudflareEmailGateway } from '../infrastructure/email/cloudflare-email-gateway';
import { makeContactEndpoint } from '../infrastructure/http/contact-endpoint';
import { makeCloudflareRateLimiter } from '../infrastructure/security/cloudflare-rate-limiter';
import { makeTurnstileVerifier } from '../infrastructure/security/turnstile-verifier';
import { systemClock } from '../infrastructure/system/system-clock';

/**
 * Composition for the contact endpoint, kept apart from the content container so that the
 * Workers runtime modules are only loaded by the one route that needs them.
 */
const submitContactRequest = makeSubmitContactRequest({
  gateway: makeCloudflareEmailGateway({
    transport: {
      send: (from, to, raw) => env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw)),
    },
    fromAddress: CONTACT_FROM_EMAIL,
    toAddress: CONTACT_TO_EMAIL,
    newId: () => crypto.randomUUID(),
  }),
  // A missing secret fails closed: an empty secret never verifies a token.
  verifier: makeTurnstileVerifier({ secret: TURNSTILE_SECRET_KEY ?? '', fetch }),
  rateLimiter: makeCloudflareRateLimiter(env.CONTACT_RATE_LIMITER),
  clock: systemClock,
});

export const handleContactRequest = makeContactEndpoint({
  submit: submitContactRequest,
  log: (entry) => {
    console.log(JSON.stringify(entry));
  },
  newId: () => crypto.randomUUID(),
});
