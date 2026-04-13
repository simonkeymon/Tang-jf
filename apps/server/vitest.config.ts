import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,js,tsx}'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@tang/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@tang/shared/*': path.resolve(__dirname, '../../packages/shared/src/*'),
    },
  },
});
