import { z } from 'zod';
import { CAPABILITIES } from '../enums.js';

// GeoJSON Point validator — enforces [lng, lat] within valid ranges.
export const geoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z
    .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    .describe('[longitude, latitude]'),
});

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM');

// PATCH /me — profile fields a user may edit. homeArea is the FUZZED location;
// precise home is never accepted or returned here.
export const updateMeSchema = z
  .object({
    displayName: z.string().min(1).max(80),
    avatarUrl: z.string().url(),
    homeArea: z.object({
      point: geoPointSchema,
      label: z.string().max(120).optional(),
    }),
    capabilities: z.array(z.enum(CAPABILITIES)).max(CAPABILITIES.length),
  })
  .partial();
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

// PATCH /me/search-prefs — alert preferences (spec §7 User.searchPrefs).
export const updateSearchPrefsSchema = z
  .object({
    species: z.array(z.string().min(1).max(60)).max(50),
    radiusKm: z.number().min(0.5).max(50),
    available: z.boolean(),
    availableUntil: z.string().datetime().nullable(),
    quietHours: z
      .object({ start: timeOfDay, end: timeOfDay })
      .nullable(),
  })
  .partial();
export type UpdateSearchPrefsInput = z.infer<typeof updateSearchPrefsSchema>;
