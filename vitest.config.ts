import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Look for tests anywhere under packages/*/src and apps/*/src with test/spec suffix
    include: [
      'packages/**/src/**/*.{test,spec}.{ts,js,tsx}',
      'apps/**/src/**/*.{test,spec}.{ts,js,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@tang/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@tang/shared/*': path.resolve(__dirname, 'packages/shared/src/*'),
    },
  },
  coverage: {
    provider: 'v8',
  },
});
