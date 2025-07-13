import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'quotes': ['error', 'single'],
      'indent': ['warn', 2, { 'SwitchCase': 0 }],
      'linebreak-style': ['error', 'windows'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'dot-notation': 'error',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'all'],
      'brace-style': ['error'],
      'prefer-arrow-callback': 'warn',
      'max-len': ['warn', 160],
      'object-curly-spacing': ['error', 'always'],
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', { 'classes': false, 'enums': false }],
      '@typescript-eslint/no-unused-vars': ['warn', { 'caughtErrors': 'none', 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
);
