import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@homeward/shared';
import { SESSION_COOKIE, verifySession } from '../lib/jwt.js';
import { HttpError } from '../lib/httpError.js';
import { User } from '../models/User.js';

// Require a valid session cookie; loads the user and attaches it to the request.
// Loading fresh from DB (rather than trusting token claims) keeps roles current.
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw HttpError.unauthorized('No session');

    let sub: string;
    try {
      sub = verifySession(token).sub;
    } catch {
      throw HttpError.unauthorized('Invalid session');
    }

    const user = await User.findById(sub);
    if (!user) throw HttpError.unauthorized('Session user not found');

    req.userId = user.id;
    req.userDoc = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Capability check (spec §6: roles are capabilities). Must run after requireAuth.
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const roles = (req.userDoc?.roles ?? []) as Role[];
    if (!roles.some((r) => allowed.includes(r))) {
      next(HttpError.forbidden(`Requires one of: ${allowed.join(', ')}`));
      return;
    }
    next();
  };
}
