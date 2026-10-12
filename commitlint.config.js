export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      ['domain', 'application', 'infra', 'ui', 'content', 'pages', 'ci', 'docs', 'deps', 'tests'],
    ],
  },
};
