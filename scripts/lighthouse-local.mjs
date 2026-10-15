#!/usr/bin/env node
// Lighthouse on the workstation, the same way CI measures (docs/runbooks/deploy.md): Chrome on
// Linux in a container (it fails on Windows with NO_NAVSTART), mobile defaults, the pages of
// lighthouserc.json at http://localhost:4331, served compressed (scripts/preview-compressed.mjs).
// A round takes about 3 minutes instead of a CI round of 8 to 11.
//
// A busy workstation only makes the numbers worse: it inflates Total Blocking Time (0 in CI on
// these pages) and, when other work takes the CPU, FCP and LCP too (the same page scored 0.77 and
// 0.99 a minute apart; Lighthouse's CPU benchmark read 128 to 621 locally, about 3500 in CI). So
// each page is judged by its best run of three, scored with TBT 0 (scripts/lib/lighthouse-score.mjs),
// against the minimum in lighthouserc.json. A real regression lowers every run, the best included.
//
// Usage: pnpm build && pnpm lighthouse:local [/path ...]   (needs Docker; RUNS=1 for a quick look)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { performanceScore } from './lib/lighthouse-score.mjs';

const IMAGE = 'juancespedes-lighthouse:12';
const PORT = 4331;
const RUNS = Number(process.env.RUNS ?? '3');

const config = JSON.parse(readFileSync('lighthouserc.json', 'utf8'));
const minimum =
  config.ci.assert.assertMatrix[0].assertions['categories:performance'][1].minScore ?? 0.95;
const configured = config.ci.collect.url.map((/** @type {string} */ url) => new URL(url).pathname);
// Git Bash rewrites an argument that looks like a POSIX path (/en becomes C:/Program Files/Git/en):
// undo that, and accept paths without the leading slash (en, proyectos/plant-telemetry).
/** @param {string} arg */
const asPath = (arg) =>
  `/${arg.replace(/^[A-Za-z]:\/Program Files\/Git\/?/, '').replace(/^\//, '')}`;
const paths = process.argv.length > 2 ? process.argv.slice(2).map(asPath) : configured;

/**
 * @param {string} command
 * @param {string[]} args
 */
const run = (command, args, options = {}) =>
  spawnSync(command, args, { stdio: 'inherit', ...options });

if (spawnSync('docker', ['version'], { stdio: 'ignore' }).status !== 0) {
  console.error('Docker is not running. Start Docker Desktop and try again.');
  process.exit(1);
}
if (spawnSync('docker', ['image', 'inspect', IMAGE], { stdio: 'ignore' }).status !== 0) {
  console.log(`Building ${IMAGE} (once, about 2 minutes)...`);
  if (run('docker', ['build', '-t', IMAGE, join('scripts', 'lighthouse')]).status !== 0)
    process.exit(1);
}

// The compressed preview, reachable from the container (0.0.0.0, not the default [::1]).
const server = spawn(
  process.execPath,
  [join('scripts', 'preview-compressed.mjs'), '--port', String(PORT), '--host', '0.0.0.0'],
  { stdio: ['ignore', 'pipe', 'inherit'] },
);
const stopServer = () => {
  // On Windows the preview runs under a shell: end the whole tree, or workerd keeps dist/ locked
  // and the next `pnpm build` fails with EPERM.
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    server.kill('SIGTERM');
  }
};
process.on('exit', stopServer);
process.on('SIGINT', () => process.exit(130));

await /** @type {Promise<void>} */ (
  new Promise((resolve, reject) => {
    let output = '';
    server.stdout.on('data', (chunk) => {
      output += String(chunk);
      if (output.includes('compressed preview on')) resolve();
    });
    server.on('exit', () => reject(new Error('The preview stopped before it was ready.')));
  })
);

// Inside the container Chrome always resolves "localhost" to itself, and the preview answers 403
// to any other host name: a TCP proxy forwards the container's port 4331 to the host's, so the
// URLs are the same as CI's. The script is passed inline, so no file crosses the bind mount.
const proxy =
  "const n=require('net');n.createServer(c=>{const u=n.connect(" +
  String(PORT) +
  ",'host.docker.internal');c.pipe(u).pipe(c);c.on('error',()=>u.destroy());u.on('error',()=>c.destroy());}).listen(" +
  String(PORT) +
  ",'127.0.0.1')";
const lighthouse = paths
  .flatMap((/** @type {string} */ path) =>
    Array.from({ length: RUNS }, (_, index) => {
      const name = `${path.replace(/[^\w-]/g, '_')}-${String(index + 1)}.json`;
      const once = `lighthouse "http://localhost:${String(PORT)}${path}" --quiet --only-categories=performance --chrome-flags="--headless=new --no-sandbox" --output=json --output-path="/out/${name}"`;
      // On a busy machine Chrome now and then fails to record the trace (NO_NAVSTART): one retry.
      return `${once} || ${once} || echo "failed: ${path}"`;
    }),
  )
  .join('\n');
const out = mkdtempSync(join(tmpdir(), 'lighthouse-local-'));
// Asynchronous on purpose: a synchronous spawn blocks this process, nobody reads the preview's
// output, and on Windows (where writes to a pipe block) the preview stalls once the pipe fills.
const status = await new Promise((resolve) => {
  spawn(
    'docker',
    [
      'run',
      '--rm',
      '--add-host=host.docker.internal:host-gateway',
      '-v',
      `${out}:/out`,
      IMAGE,
      'bash',
      '-c',
      `node -e "${proxy}" &\nsleep 1\n${lighthouse}`,
    ],
    { stdio: 'inherit' },
  ).on('exit', resolve);
});
stopServer();
if (status !== 0) process.exit(status ?? 1);

// Below this CPU benchmark the workstation was busy enough to distort even the best run.
const BUSY_BENCHMARK = 300;
let failed = false;
console.log(
  `\nEstimated CI score (TBT 0), best of ${String(RUNS)} runs; minimum ${String(minimum)}`,
);
for (const path of paths) {
  const key = path.replace(/[^\w-]/g, '_');
  const reports = readdirSync(out)
    .filter((name) => name.startsWith(`${key}-`) && name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(join(out, name), 'utf8')))
    .filter((report) => !report.runtimeError);
  if (reports.length === 0) {
    console.log(`  ${path}: no report`);
    failed = true;
    continue;
  }
  const runs = reports.map(({ audits, environment }) => {
    const metric = (/** @type {string} */ id) => audits[id].numericValue;
    const metrics = {
      fcp: metric('first-contentful-paint'),
      si: metric('speed-index'),
      lcp: metric('largest-contentful-paint'),
      tbt: metric('total-blocking-time'),
      cls: metric('cumulative-layout-shift'),
    };
    const benchmark = environment.benchmarkIndex;
    return { ...metrics, benchmark, estimate: performanceScore({ ...metrics, tbt: 0 }) };
  });
  const best = runs.reduce((a, b) => (b.estimate > a.estimate ? b : a));
  const ok = best.estimate >= minimum;
  failed ||= !ok;
  const busy = best.benchmark < BUSY_BENCHMARK ? ' (machine busy: rerun with less load)' : '';
  console.log(
    `  ${ok ? 'pass' : 'FAIL'} ${best.estimate.toFixed(3)}  ${path}  FCP ${String(Math.round(best.fcp))} ms, ` +
      `LCP ${String(Math.round(best.lcp))} ms, CLS ${best.cls.toFixed(3)}, ` +
      `CPU benchmark ${String(Math.round(best.benchmark))}${ok ? '' : busy}`,
  );
}
console.log(`Reports: ${out}`);
process.exit(failed ? 1 : 0);
