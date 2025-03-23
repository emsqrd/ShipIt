import pluginJs from '@eslint/js';
import globals from 'globals';

export default [
  pluginJs.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': ['warn', { allow: ['error', 'info'] }],
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
    files: ['**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
