// The pre-commit hook (.githooks/pre-commit) checks only what is being committed, in seconds.
// The whole suite (types, architecture, unit tests with coverage, build) runs in `pnpm verify`
// and in CI; repeating it on every commit cost 2 to 5 minutes (docs/runbooks/deploy-friction.md).
export default {
  '*.{js,mjs,cjs,ts,tsx,astro}': ['prettier --write', 'eslint --max-warnings=0'],
  '*.{json,md,mdx,css,yml,yaml}': 'prettier --write',
  // The design token check scans src/ui as a whole; run it once when styles or markup change.
  'src/{ui,pages}/**/*.{css,astro,tsx}': () => 'node scripts/check-tokens.mjs',
};
