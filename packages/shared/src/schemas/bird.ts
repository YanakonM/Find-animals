import { z } from 'zod';
import { BIRD_STATUSES } from '../types/bird.js';

const currentYear = 2100; // generous upper bound for ring year validation

const legRingInputSchema = z.object({
  number: z.string().min(1).max(40),
  breederCode: z.string().max(40).optional(),
  year: z.number().int().min(1900).max(currentYear).optional(),
});

// POST /birds
export const createBirdSchema = z.object({
  name: z.string().min(1).max(60),
  category: z.literal('bird').default('bird'),
  species: z.string().min(1).max(60),
  morphColor: z.string().max(200).optional(),
  legRing: legRingInputSchema.optional(),
  microchipId: z.string().min(1).max(40).optional(),
  photos: z.array(z.string().url()).max(12).default([]),
  distinguishingMarks: z.string().max(500).optional(),
  soundsWords: z.array(z.string().min(1).max(60)).max(50).optional(),
  temperament: z.string().max(200).optional(),
  status: z.enum(BIRD_STATUSES).default('home'),
});
export type CreateBirdInput = z.infer<typeof createBirdSchema>;

// PATCH /birds/:id — every field optional; ring/microchip can be reset.
export const updateBirdSchema = createBirdSchema.partial();
export type UpdateBirdInput = z.infer<typeof updateBirdSchema>;

// GET /birds/lookup?ring= — query validation.
export const ringLookupSchema = z.object({
  ring: z.string().min(1).max(40),
});
