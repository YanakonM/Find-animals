import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
}

// Central error handler — must be registered last (4-arg signature).
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code ?? 'error', message: err.message, details: err.details },
    });
    return;
  }

  // Duplicate key (e.g. email/lineUserId already registered).
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: { code: 'conflict', message: 'Already exists' } });
    return;
  }

  logger.error({ err }, 'unhandled error');
  res.status(500).json({
    error: {
      code: 'internal',
      message: isProd ? 'Internal server error' : String((err as Error)?.message ?? err),
    },
  });
}
