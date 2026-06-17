import { Router } from 'express';
import { updateMeSchema, updateSearchPrefsSchema } from '@homeward/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { toSafeUser } from '../models/User.js';
import { updateMe, updateSearchPrefs } from '../services/userService.js';

export const meRouter = Router();

// GET /me — the Phase 0 acceptance endpoint.
meRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toSafeUser(req.userDoc!) });
  }),
);

meRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateMeSchema),
  asyncHandler(async (req, res) => {
    const updated = await updateMe(req.userDoc!, req.body);
    res.json({ user: toSafeUser(updated) });
  }),
);

meRouter.patch(
  '/me/search-prefs',
  requireAuth,
  validateBody(updateSearchPrefsSchema),
  asyncHandler(async (req, res) => {
    const updated = await updateSearchPrefs(req.userDoc!, req.body);
    res.json({ user: toSafeUser(updated) });
  }),
);
