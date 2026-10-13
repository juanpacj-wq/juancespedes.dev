// @ts-check
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://juancespedes.dev',
  // Clean URLs: /design-system is served directly, no redirect to /design-system/.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), mdx()],
  // Code in notes: both Shiki themes as CSS variables, so the site theme picks the colors. The
  // light theme is the high-contrast one: github-light's orange and red fail AA on our surface.
  // (global.css) instead of a fixed dark block in the light theme.
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light-high-contrast', dark: 'github-dark' },
      defaultColor: false,
    },
  },
  // Images are optimized at build time (sharp); no Cloudflare Images binding needed.
  adapter: cloudflare({ imageService: 'compile' }),
  // No server-side sessions: the site has no accounts. Avoids provisioning a KV namespace.
  session: false,
  env: {
    // Validated when the server starts: a missing or malformed variable fails fast.
    schema: {
      APP_VERSION: envField.string({ context: 'server', access: 'public', default: 'dev' }),
      // Contact form. The public site key defaults to Cloudflare's Turnstile test key; the secret
      // has no default on purpose: without it, verification fails closed. Local runs and CI read
      // the test secret from .dev.vars (see .env.example); production uses a Worker secret.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '1x00000000000000000000AA',
      }),
      // Cloudflare Web Analytics site token (public by design). Set only for production deploys,
      // so local runs, tests and pull request previews never send page views (ADR 0013).
      PUBLIC_WEB_ANALYTICS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CONTACT_FROM_EMAIL: envField.string({
        context: 'server',
        access: 'public',
        default: 'contacto@juancespedes.dev',
      }),
      CONTACT_TO_EMAIL: envField.string({
        context: 'server',
        access: 'public',
        default: 'juanpablocespedesj@gmail.com',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
