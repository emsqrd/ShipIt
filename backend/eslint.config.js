import pluginJs from '@eslint/js';
import airbnbBase from 'eslint-config-airbnb-base';

export default [
  pluginJs.configs.recommended,
  ...airbnbBase,
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
    },
  },
];
