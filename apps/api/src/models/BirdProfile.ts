import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { BIRD_STATUSES, type BirdProfile as BirdProfileDTO } from '@homeward/shared';

// Pet passport (spec §7). Ring registry: legRing.normalized carries a UNIQUE
// sparse index — the primary identity key for the ring-first matcher (§8A).
const legRingSchema = new Schema(
  {
    number: { type: String, required: true },
    normalized: { type: String, required: true },
    breederCode: { type: String },
    year: { type: Number },
  },
  { _id: false },
);

const birdProfileSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['bird'], default: 'bird' },
    species: { type: String, required: true, index: true },
    morphColor: { type: String },
    legRing: { type: legRingSchema, required: false },
    microchipId: { type: String },
    photos: { type: [String], default: [] },
    distinguishingMarks: { type: String },
    soundsWords: { type: [String], default: undefined },
    temperament: { type: String },
    status: { type: String, enum: BIRD_STATUSES, default: 'home' },
  },
  { timestamps: true },
);

// Ring number is the primary identity key — unique across the registry (sparse so
// birds without a ring are allowed). Microchip is the secondary unique key.
birdProfileSchema.index({ 'legRing.normalized': 1 }, { unique: true, sparse: true });
birdProfileSchema.index({ microchipId: 1 }, { unique: true, sparse: true });

export type BirdProfileDoc = InferSchemaType<typeof birdProfileSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type BirdProfileDocument = HydratedDocument<BirdProfileDoc>;

export const BirdProfile = model('BirdProfile', birdProfileSchema);

// Full owner-facing serialization.
export function toBirdDTO(doc: BirdProfileDocument): BirdProfileDTO {
  return {
    id: doc.id,
    ownerId: (doc.ownerId as Types.ObjectId).toString(),
    name: doc.name,
    category: 'bird',
    species: doc.species,
    morphColor: doc.morphColor ?? undefined,
    legRing: doc.legRing
      ? {
          number: doc.legRing.number,
          normalized: doc.legRing.normalized,
          breederCode: doc.legRing.breederCode ?? undefined,
          year: doc.legRing.year ?? undefined,
        }
      : undefined,
    microchipId: doc.microchipId ?? undefined,
    photos: doc.photos ?? [],
    distinguishingMarks: doc.distinguishingMarks ?? undefined,
    soundsWords: doc.soundsWords ?? undefined,
    temperament: doc.temperament ?? undefined,
    status: doc.status as BirdProfileDTO['status'],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// Minimal public info for ring lookup (spec §9: "returns minimal public info").
// Deliberately excludes owner identity, microchip, and free-text notes.
export interface RingLookupResult {
  found: boolean;
  bird?: {
    name: string;
    species: string;
    status: BirdProfileDTO['status'];
    ring: string;
    primaryPhoto?: string;
  };
}

export function toRingLookup(doc: BirdProfileDocument | null): RingLookupResult {
  if (!doc || !doc.legRing) return { found: false };
  return {
    found: true,
    bird: {
      name: doc.name,
      species: doc.species,
      status: doc.status as BirdProfileDTO['status'],
      ring: doc.legRing.normalized,
      primaryPhoto: doc.photos?.[0],
    },
  };
}
