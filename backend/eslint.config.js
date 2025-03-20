import pluginJs from '@eslint/js';

export default [
  pluginJs.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
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
];
