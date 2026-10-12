// @ts-check
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://juancespedes.dev',
  integrations: [react(), mdx()],
  // Images are optimized at build time (sharp); no Cloudflare Images binding needed.
  adapter: cloudflare({ imageService: 'compile' }),
  // No server-side sessions: the site has no accounts. Avoids provisioning a KV namespace.
  session: false,
  env: {
    // Validated when the server starts: a missing or malformed variable fails fast.
    schema: {
      APP_VERSION: envField.string({ context: 'server', access: 'public', default: 'dev' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
