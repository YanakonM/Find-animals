import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// Attach/propagate a request id for log correlation (spec §14 observability).
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader('x-request-id', id);
  next();
}
