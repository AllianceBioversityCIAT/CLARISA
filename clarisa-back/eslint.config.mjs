import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/*.config.mjs', '**/*.config.js', 'migrations/**', 'test/**'],
  },
  ...compat.extends(
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:prettier/recommended',
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
      },
    },

    rules: {
      // mark empty classes as error, but allow them if they have decorators
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-duplicate-imports': 'error',
      '@typescript-eslint/prefer-destructuring': 'warn',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/no-for-in-array': 'warn',
      '@typescript-eslint/prefer-readonly-parameter-types': [
        'warn',
        {
          //TODO check why this did not allow to limit this to only the express library
          allow: ['Request', 'Response', 'HttpService', 'DataSource', 'EntityManager'],
          ignoreInferredTypes: true,
        },
      ],
      'logical-assignment-operators': 'warn',
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-shadow': 'error',
      'no-param-reassign': 'error',
      '@typescript-eslint/no-magic-numbers': 'warn',
      '@typescript-eslint/only-throw-error': 'error',
      'no-nested-ternary': 'error',
      'prefer-template': 'warn',
      'prefer-template': 'warn',
      'no-var': 'error',
      eqeqeq: 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // mark empty blocks (if, loops, try..catch) as error
      'no-empty': 'error',
      complexity: ['error', 15],
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        { allowNumber: true, allowBoolean: true },
      ],
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': [
        'warn',
        {
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreTypeIndexes: true,
        },
      ],
    },
  },
];
