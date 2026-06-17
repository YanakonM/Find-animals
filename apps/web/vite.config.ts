import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read VITE_* vars from the monorepo root .env (single source of truth).
  envDir: resolve(__dirname, '../../'),
  server: {
    port: 5173,
  },
});
