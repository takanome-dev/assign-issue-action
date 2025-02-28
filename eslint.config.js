import jest from 'eslint-plugin-jest';
import tslint from '@typescript-eslint/eslint-plugin';
import tslintParser from '@typescript-eslint/parser';

export default [
  {
    languageOptions: {
      parser: tslintParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      jest: jest,
      '@typescript-eslint': tslint,
    },
    rules: {
      'import/no-namespace': 'off',
      'eslint-comments/no-use': 'off',
      'i18n-text/no-en': 'off',
      camelcase: 'off',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    ignores: [
      '**/*.js',
      'lib/*',
      'dist/*',
      'coverage/*',
      'node_modules/*',
      '__tests__/*',
      '__mocks__/*',
    ],
  },
];
