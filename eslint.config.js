// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Layer rule (see docs/adr/0001-layered-architecture.md):
 *   domain <- application <- infrastructure | ui <- composition <- pages
 * Each layer may import only from the layers listed for it below.
 */
const layers = [
  { type: 'domain', pattern: 'src/domain/**' },
  { type: 'application', pattern: 'src/application/**' },
  { type: 'infrastructure', pattern: 'src/infrastructure/**' },
  { type: 'ui', pattern: 'src/ui/**' },
  { type: 'composition', pattern: 'src/composition/**' },
  { type: 'pages', pattern: 'src/pages/**' },
];

const allowed = {
  domain: ['domain'],
  application: ['domain', 'application'],
  infrastructure: ['domain', 'application', 'infrastructure'],
  ui: ['domain', 'ui'],
  composition: ['domain', 'application', 'infrastructure', 'composition'],
  pages: ['domain', 'ui', 'composition'],
};

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.astro/',
      '.wrangler/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      // Stryker's sandbox copy and its HTML report (ADR 0014).
      '.stryker-tmp/',
      'reports/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-strict'],
  {
    // React islands: accessibility and hooks rules.
    files: ['**/*.{jsx,tsx}'],
    extends: [jsxA11y.configs.strict, reactHooks.configs.flat.recommended],
  },
  {
    files: ['src/**/*.{ts,tsx,astro}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': layers,
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: Object.entries(allowed).map(([from, to]) => ({
            from: { element: { type: from } },
            allow: { to: { element: { types: { anyOf: to } } } },
          })),
        },
      ],
    },
  },
  {
    // The domain is framework-free: no Astro, React, Node or vendor SDKs.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['astro', 'astro:*', 'react', 'node:*', '@anthropic-ai/*', 'zod'] },
      ],
    },
  },
  {
    files: ['**/*.astro'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
);
