import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES, CAPABILITIES, type SafeUser } from '@homeward/shared';

// GeoJSON Point subschema (spec §7). 2dsphere indexes are added on the fields
// that are queried by proximity. homeArea is the fuzzed public point; preciseHome
// is server-only and never serialized.
const pointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    lineUserId: { type: String, index: { unique: true, sparse: true } },
    email: { type: String, index: { unique: true, sparse: true }, lowercase: true },
    // Server-only: email/password fallback (spec §4). select:false so it is never
    // returned unless explicitly requested for verification.
    passwordHash: { type: String, select: false },

    displayName: { type: String, required: true },
    avatarUrl: { type: String },

    roles: { type: [String], enum: ROLES, default: ['eyes'] },

    // FUZZED public location (spec §8E).
    homeArea: {
      type: new Schema(
        {
          point: { type: pointSchema, required: true },
          label: { type: String },
        },
        { _id: false },
      ),
      required: false,
    },

    // NEVER returned to other users (spec §8E). select:false as a safety net.
    preciseHome: {
      type: new Schema({ point: { type: pointSchema, required: true } }, { _id: false }),
      required: false,
      select: false,
    },

    searchPrefs: {
      type: new Schema(
        {
          species: { type: [String], default: [] },
          radiusKm: { type: Number, default: 3 },
          available: { type: Boolean, default: false },
          availableUntil: { type: Date },
          quietHours: {
            type: new Schema(
              { start: { type: String }, end: { type: String } },
              { _id: false },
            ),
            required: false,
          },
        },
        { _id: false },
      ),
      required: false,
    },

    capabilities: { type: [String], enum: CAPABILITIES, default: undefined },
    capabilityVerified: { type: Boolean, default: false },

    reputation: { type: Number, default: 0 },

    pushTokens: {
      type: new Schema({ webPush: { type: [Schema.Types.Mixed], default: undefined } }, { _id: false }),
      required: false,
    },
  },
  { timestamps: true },
);

// homeArea.point queried by proximity in dispatch (spec §8B).
userSchema.index({ 'homeArea.point': '2dsphere' });

// InferSchemaType omits the timestamps fields; add them explicitly.
export type UserDoc = InferSchemaType<typeof userSchema> & {
  createdAt: Date;
  updatedAt: Date;
};
export type UserDocument = HydratedDocument<UserDoc>;

export const User = model('User', userSchema);

/**
 * Serialize a user document to the public, API-safe shape.
 * Strips server-only fields (passwordHash, preciseHome) by construction —
 * we only copy the allowlisted fields below.
 */
export function toSafeUser(doc: UserDocument): SafeUser {
  return {
    id: doc.id,
    lineUserId: doc.lineUserId ?? undefined,
    email: doc.email ?? undefined,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl ?? undefined,
    roles: doc.roles as SafeUser['roles'],
    homeArea: doc.homeArea
      ? {
          point: {
            type: 'Point',
            coordinates: doc.homeArea.point.coordinates as [number, number],
          },
          label: doc.homeArea.label ?? undefined,
        }
      : undefined,
    searchPrefs: doc.searchPrefs
      ? {
          species: doc.searchPrefs.species ?? [],
          radiusKm: doc.searchPrefs.radiusKm ?? 3,
          available: doc.searchPrefs.available ?? false,
          availableUntil: doc.searchPrefs.availableUntil?.toISOString(),
          quietHours:
            doc.searchPrefs.quietHours?.start && doc.searchPrefs.quietHours.end
              ? {
                  start: doc.searchPrefs.quietHours.start,
                  end: doc.searchPrefs.quietHours.end,
                }
              : undefined,
        }
      : undefined,
    capabilities: (doc.capabilities as SafeUser['capabilities']) ?? undefined,
    capabilityVerified: doc.capabilityVerified ?? false,
    reputation: doc.reputation ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
