import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        NodeJS: 'readonly', // Add NodeJS namespace as a global
      },
    },
    rules: {
      'no-unused-vars': 'off', // Turned off in favor of @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-console': ['error', { allow: ['error', 'info', 'warn'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AwaitExpression > AwaitExpression.argument',
          message: 'Double await is not allowed',
        },
      ],
    },
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
