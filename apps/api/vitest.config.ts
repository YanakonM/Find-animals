import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // setupEnv runs before each test module is imported, so config/env.ts sees
    // valid env (incl. a placeholder MONGODB_URI) before it validates.
    setupFiles: ['./test/setupEnv.ts'],
    // mongodb-memory-server first download can be slow.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
