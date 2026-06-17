import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { HttpError } from '../lib/httpError.js';

// Validate req.body against a zod schema and replace it with the parsed value.
// Keeps controllers free of validation boilerplate.
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(HttpError.badRequest('Validation failed', err.flatten()));
        return;
      }
      next(err);
    }
  };
}
