import jest from 'eslint-plugin-jest';
import tslint from '@typescript-eslint/eslint-plugin';
import tslintParser from '@typescript-eslint/parser';
import github from 'eslint-plugin-github';

export default [
  github.getFlatConfigs().recommended,
  ...github.getFlatConfigs().typescript,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    ignores: ['eslint.config.js'],
    rules: {
      'github/array-foreach': 'error',
      'github/async-preventdefault': 'warn',
      'github/no-then': 'error',
      'github/no-blur': 'error',
      'import/no-unresolved': 'off',
    },
  },
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
