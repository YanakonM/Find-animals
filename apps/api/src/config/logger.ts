import { pino } from 'pino';
import { env, isProd, isTest } from './env.js';

// Structured logs (spec §14). Pretty in dev is optional; we keep plain JSON to
// avoid an extra dependency, and stay quiet during tests.
export const logger = pino({
  level: isTest ? 'silent' : isProd ? 'info' : 'debug',
  base: { service: 'homeward-api', env: env.NODE_ENV },
});
