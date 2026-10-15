// Templates for `pnpm new:project`. Pure functions so tests can check that every generated
// file is valid content. Generated projects start as drafts with TODO markers; the content
// tests refuse to publish a project that still contains TODO.

export const KINDS = /** @type {const} */ (['case-study', 'report', 'open-source', 'tool']);

const TODO = { es: 'TODO: completar', en: 'TODO: fill in' };

/** @param {string} value */
const quote = (value) => `'${value.replace(/'/g, "''")}'`;

/**
 * @param {(typeof KINDS)[number]} kind
 * @param {'es' | 'en'} locale
 * @returns {string[]}
 */
const kindFields = (kind, locale) => {
  const todo = TODO[locale];
  switch (kind) {
    case 'case-study':
      return [
        'story:',
        `  hook: ${quote(todo)}`,
        '  shifts:',
        `    - { before: ${quote(todo)}, after: ${quote(todo)} }`,
        `problem: ${quote(todo)}`,
        'responsibilities: []',
        'constraints:',
        `  - ${quote(todo)}`,
        'decisions:',
        `  - title: ${quote(todo)}`,
        `    rationale: ${quote(todo)}`,
        '    alternatives: []',
        'architecture:',
        `  summary: ${quote(todo)}`,
        '  layers:',
        `    - name: ${quote(todo)}`,
        '      nodes:',
        `        - { id: source, label: ${quote(todo)} }`,
        `    - name: ${quote(todo)}`,
        '      nodes:',
        `        - { id: service, label: ${quote(todo)} }`,
        '  flows:',
        `    - { from: source, to: service, label: ${quote(todo)} }`,
        'outcomes:',
        `  - ${quote(todo)}`,
        'lessons:',
        `  - ${quote(todo)}`,
      ];
    case 'report':
      return [
        'tool: Power BI',
        'businessQuestions:',
        `  - ${quote(todo)}`,
        'dataSources:',
        `  - ${quote(todo)}`,
        'highlightedMeasures: []',
      ];
    case 'open-source':
      return ['repository: https://github.com/juanpacj-wq/TODO', 'license: MIT', 'install: null'];
    case 'tool':
      return [`platform: ${quote(todo)}`, `automates: ${quote(todo)}`];
  }
};

/** Default capability and stack per kind, so the draft is valid from the first save. */
const DEFAULTS = {
  'case-study': { capabilities: ['backend'], stack: ['TypeScript'] },
  report: { capabilities: ['data-bi'], stack: ['Power BI'] },
  'open-source': { capabilities: ['automation-ai'], stack: ['TypeScript'] },
  tool: { capabilities: ['automation-ai'], stack: ['Python'] },
};

/**
 * @param {{ kind: (typeof KINDS)[number], title: string, locale: 'es' | 'en', start: string }} input
 * @returns {string} the MDX file content
 */
export const renderProjectFile = ({ kind, title, locale, start }) => {
  const { capabilities, stack } = DEFAULTS[kind];
  const todo = TODO[locale];
  return [
    '---',
    `kind: ${kind}`,
    `title: ${quote(title)}`,
    `summary: ${quote(todo)}`,
    `role: ${quote(todo)}`,
    `period: { start: '${start}', end: null }`,
    `capabilities: [${capabilities.join(', ')}]`,
    'stack:',
    ...stack.map((name) => `  - ${name}`),
    'metrics: []',
    'featured: false',
    'order: 100',
    'status: draft',
    'confidentiality: anonymized',
    ...kindFields(kind, locale),
    '---',
    '',
    locale === 'es'
      ? '{/* La página del proyecto se arma con los campos de arriba. Guía: docs/adding-a-project.md */}'
      : '{/* The project page is built from the fields above. Guide: docs/adding-a-project.md */}',
    '',
  ].join('\n');
};

/** @param {string} slug */
export const isValidSlug = (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
