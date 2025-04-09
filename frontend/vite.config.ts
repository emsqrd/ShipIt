import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
});
