import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createBirdSchema, updateBirdSchema, ringLookupSchema } from '@homeward/shared';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { HttpError } from '../lib/httpError.js';
import {
  BirdProfile,
  toBirdDTO,
  toRingLookup,
  type BirdProfileDocument,
} from '../models/BirdProfile.js';
import {
  createBird,
  listBirdsByOwner,
  updateBird,
  lookupByRing,
} from '../services/birdService.js';
import { generatePosterPng } from '../lib/poster.js';
import { mediaStore } from '../lib/media.js';

export const birdsRouter = Router();

// Ring lookup is a public-ish surface (finders read a ring) — rate-limit it
// (spec §12 anti-theft: don't let it be scraped).
const lookupLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20 });

// Load a bird the caller owns, or throw. Used by mutating/owner-only routes.
async function loadOwnBird(req: Request): Promise<BirdProfileDocument> {
  const bird = await BirdProfile.findById(req.params.id);
  if (!bird) throw HttpError.notFound('Bird not found');
  if (bird.ownerId.toString() !== req.userId) throw HttpError.forbidden('Not your bird');
  return bird;
}

// POST /birds — create a passport (also grants the owner role).
birdsRouter.post(
  '/birds',
  requireAuth,
  validateBody(createBirdSchema),
  asyncHandler(async (req, res) => {
    const bird = await createBird(req.userDoc!, req.body);
    res.status(201).json({ bird: toBirdDTO(bird) });
  }),
);

// GET /birds?owner=me — the owner's own passports.
birdsRouter.get(
  '/birds',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.query.owner !== 'me') {
      throw HttpError.badRequest('Only ?owner=me is supported');
    }
    const birds = await listBirdsByOwner(req.userId!);
    res.json({ birds: birds.map(toBirdDTO) });
  }),
);

// GET /birds/lookup?ring= — rate-limited; returns minimal public info.
// Declared BEFORE /birds/:id so "lookup" isn't captured as an id.
birdsRouter.get(
  '/birds/lookup',
  lookupLimiter,
  asyncHandler(async (req, res) => {
    const parsed = ringLookupSchema.safeParse(req.query);
    if (!parsed.success) throw HttpError.badRequest('ring query is required');
    const bird = await lookupByRing(parsed.data.ring);
    res.json(toRingLookup(bird));
  }),
);

// GET /birds/:id — full passport (auth required).
birdsRouter.get(
  '/birds/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bird = await BirdProfile.findById(req.params.id);
    if (!bird) throw HttpError.notFound('Bird not found');
    res.json({ bird: toBirdDTO(bird) });
  }),
);

// PATCH /birds/:id — owner only.
birdsRouter.patch(
  '/birds/:id',
  requireAuth,
  validateBody(updateBirdSchema),
  asyncHandler(async (req, res) => {
    const bird = await loadOwnBird(req);
    const updated = await updateBird(bird, req.body);
    res.json({ bird: toBirdDTO(updated) });
  }),
);

const posterBodySchema = z.object({
  mode: z.enum(['registered', 'lost']).optional(),
  contact: z.string().min(1).max(120).optional(),
});

// POST /birds/:id/poster — render a shareable flyer (works with no loss event:
// the Phase 1 wedge). Stores via MediaStore and returns its URL.
birdsRouter.post(
  '/birds/:id/poster',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bird = await loadOwnBird(req);
    const opts = posterBodySchema.parse(req.body ?? {});
    const contact = opts.contact ?? req.userDoc!.displayName;
    const png = await generatePosterPng(bird, { mode: opts.mode, contact });
    const result = await mediaStore.uploadImage({
      buffer: png,
      contentType: 'image/png',
      folder: 'posters',
    });
    res.status(201).json({ posterUrl: result.url });
  }),
);
