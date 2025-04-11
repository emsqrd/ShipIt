import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Make sure environment variables are properly stringified
      // This ensures they're available at both build time and runtime
      'import.meta.env.VITE_SHIP_IT_API_URL': JSON.stringify(env.VITE_SHIP_IT_API_URL || ''),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      exclude: [...configDefaults.exclude],
      coverage: {
        exclude: [
          'node_modules/',
          'dist/',
          'src/setupTests.ts',
          'src/contracts/**',
          '**/*.config.js',
          '**/*.config.ts',
          '**/tsconfig*.json',
          '**/*.d.ts',
        ],
      },
    },
  };
});
