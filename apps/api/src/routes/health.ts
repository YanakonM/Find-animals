import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { mongoStatus } from '../db/mongoose.js';
import { queueStatus } from '../lib/queue.js';
import { cloudinaryStatus } from '../lib/cloudinary.js';
import { lineVerifier } from '../lib/lineVerifier.js';
import { mediaStore } from '../lib/media.js';

export const healthRouter = Router();

// Liveness + dependency snapshot. Returns 200 even if optional deps are down so
// the API is observable rather than failing closed during Phase 0 dev.
healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const [mongo, queue] = [mongoStatus(), await queueStatus()];
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      deps: {
        mongo,
        redis: queue,
        cloudinary: cloudinaryStatus(),
        media: mediaStore.kind,
        lineAuth: lineVerifier.mode,
      },
    });
  }),
);
