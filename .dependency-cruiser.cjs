/**
 * Second, independent check of the layer rule (ESLint boundaries is the first).
 * Also renders the dependency graph published in docs/architecture.md.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      comment: 'The domain depends on nothing but itself.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { pathNot: '^src/domain' },
    },
    {
      name: 'application-depends-on-domain-only',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|ui|composition|pages)' },
    },
    {
      name: 'infrastructure-does-not-know-delivery',
      severity: 'error',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/(ui|composition|pages)' },
    },
    {
      name: 'ui-does-not-reach-data',
      comment: 'UI renders view models; it never talks to adapters or use cases directly.',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '^src/(application|infrastructure|composition|pages)' },
    },
    {
      name: 'pages-go-through-composition',
      severity: 'error',
      from: { path: '^src/pages' },
      to: { path: '^src/(application|infrastructure)' },
    },
    {
      name: 'no-test-code-in-src',
      severity: 'error',
      from: { path: '^src' },
      to: { path: '^tests' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(dist|\\.astro|\\.wrangler)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.astro'],
    },
    reporterOptions: {
      mermaid: { minify: false },
    },
  },
};
