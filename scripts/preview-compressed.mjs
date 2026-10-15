#!/usr/bin/env node
// The production build as Cloudflare serves it, for Lighthouse: `astro preview` (workerd) answers
// without compression, so the budget used to pay for bytes visitors never download (the case
// study's HTML is 98 kB raw and 24 kB over the wire). This starts the preview on an inner port
// and puts a proxy in front that compresses text responses with Brotli, like the edge does.
//
// Usage: node scripts/preview-compressed.mjs [--port 4331] [--host 127.0.0.1]
// Prints "ready" once both servers answer (lighthouserc.json waits for it).
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream';
import { constants, createBrotliCompress } from 'node:zlib';

/**
 * @param {string} name
 * @param {string} fallback
 */
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};
const PORT = Number(arg('port', '4331'));
const HOST = arg('host', '127.0.0.1');
const INNER = PORT + 1;

// What Cloudflare compresses: text formats. Images and fonts are already compressed.
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/;

// Astro's own entry point with this Node, not `pnpm exec`: on Windows that goes through cmd.exe,
// and when the intermediate process ends first the preview is orphaned, keeps dist/ locked and
// holds the terminal open.
const astro = join(process.cwd(), 'node_modules', 'astro', 'bin', 'astro.mjs');
const preview = spawn(process.execPath, [astro, 'preview', '--port', String(INNER)], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
// Astro's output is shown until the server is ready; after that it logs every request, which
// would only fill the pipe of whoever started this script. It is still read, so Astro never blocks.
let quiet = false;
preview.stdout.on('data', (chunk) => {
  if (!quiet) process.stdout.write(chunk);
});
const stop = () => {
  preview.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
preview.on('exit', (code) => process.exit(code ?? 1));

// A stream that ends early (a client that leaves mid-response) needs no cleanup beyond its own.
const closed = () => {
  // Nothing to do: pipeline already destroyed both ends.
};

const proxy = createServer((incoming, outgoing) => {
  const upstream = request(
    {
      host: 'localhost',
      port: INNER,
      method: incoming.method,
      path: incoming.url,
      headers: { ...incoming.headers, 'accept-encoding': 'identity' },
    },
    (response) => {
      // The client may have left while the preview answered (a test that navigates on): piping
      // into its closed socket throws at once and would take the whole server down.
      if (outgoing.destroyed) {
        response.resume();
        return;
      }
      const headers = { ...response.headers };
      const type = String(headers['content-type'] ?? '');
      const wantsBrotli = /\bbr\b/.test(String(incoming.headers['accept-encoding'] ?? ''));
      if (!wantsBrotli || !COMPRESSIBLE.test(type) || headers['content-encoding']) {
        outgoing.writeHead(response.statusCode ?? 502, headers);
        pipeline(response, outgoing, closed);
        return;
      }
      delete headers['content-length'];
      headers['content-encoding'] = 'br';
      headers.vary = headers.vary ? `${String(headers.vary)}, Accept-Encoding` : 'Accept-Encoding';
      outgoing.writeHead(response.statusCode ?? 502, headers);
      const brotli = createBrotliCompress({
        params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
      });
      pipeline(response, brotli, outgoing, closed);
    },
  );
  upstream.on('error', () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  pipeline(incoming, upstream, closed);
});

/** @param {string} url */
const answers = async (url) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

proxy.listen(PORT, HOST, async () => {
  for (let tries = 0; tries < 240; tries += 1) {
    if (
      await answers(`http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${String(PORT)}/api/health`)
    ) {
      quiet = true;
      console.log(`ready: compressed preview on http://${HOST}:${String(PORT)}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.error('The preview did not answer within 2 minutes.');
  stop();
});
