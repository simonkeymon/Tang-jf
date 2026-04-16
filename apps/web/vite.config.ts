import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const sharedSrc = path.resolve(__dirname, '../../packages/shared/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@tang\/shared$/,
        replacement: `${sharedSrc}/index.ts`,
      },
      {
        find: /^@tang\/shared\/(.*)$/,
        replacement: `${sharedSrc}/$1`,
      },
    ],
  },
  server: {
    port: 5173,
  },
});
