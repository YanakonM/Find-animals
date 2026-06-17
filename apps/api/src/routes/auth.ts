import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registerSchema, loginSchema, lineLoginSchema } from '@homeward/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { signSession, sessionCookieOptions, SESSION_COOKIE } from '../lib/jwt.js';
import { lineVerifier } from '../lib/lineVerifier.js';
import { registerWithEmail, loginWithEmail, loginWithLine } from '../services/authService.js';
import { toSafeUser, type UserDocument } from '../models/User.js';

export const authRouter = Router();

// Rate-limit auth endpoints (spec §14): blunt anti-bruteforce / anti-spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function issueSession(res: import('express').Response, user: UserDocument) {
  const token = signSession(user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  return toSafeUser(user);
}

authRouter.post(
  '/auth/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await registerWithEmail(req.body);
    res.status(201).json({ user: issueSession(res, user) });
  }),
);

authRouter.post(
  '/auth/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await loginWithEmail(req.body);
    res.json({ user: issueSession(res, user) });
  }),
);

// LINE Login (spec §9). Uses the real verifier when LINE_CHANNEL_ID is set,
// otherwise the dev stub. Either way it exchanges an id_token for a session.
authRouter.post(
  '/auth/line',
  authLimiter,
  validateBody(lineLoginSchema),
  asyncHandler(async (req, res) => {
    const profile = await lineVerifier.verify(req.body.idToken);
    const user = await loginWithLine(profile);
    res.json({ user: issueSession(res, user) });
  }),
);

authRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});
