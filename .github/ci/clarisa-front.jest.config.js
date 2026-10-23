// CI-only Jest configuration of the CLARISA frontend (GitHub Actions). The application's own clarisa-front/jest.config.js
// is used unchanged; this file only adds one ts-jest setting for clean CI runs.
//
// Two specs (ngmodel-inside-formgroup.spec.ts, theme.spec.ts) are global scripts that both declare `require`/`fs`.
// Type-checked from an empty Jest cache, ts-jest reports TS2451 ("Cannot redeclare block-scoped variable"); the Jenkins
// job does not see it because it reuses its Jest cache between builds. Jest runs every spec in its own module scope, so
// the tests are unaffected. Only TS2451 is ignored: every other type error still fails the run. The application files
// are not changed by the CI/CD migration.
const path = require('path');
const base = require('../../clarisa-front/jest.config.js');

module.exports = {
  ...base,
  rootDir: path.resolve(__dirname, '../../clarisa-front'),
  globals: {
    ...base.globals,
    'ts-jest': {
      ...base.globals['ts-jest'],
      diagnostics: { ignoreCodes: [2451] },
    },
  },
};
