import type { UpdateMeInput, UpdateSearchPrefsInput } from '@homeward/shared';
import type { UserDocument } from '../models/User.js';

// Apply an allowlisted profile patch (spec §9 PATCH /me). Only fields present in
// the validated input are touched; precise home is never settable here.
export async function updateMe(user: UserDocument, input: UpdateMeInput): Promise<UserDocument> {
  if (input.displayName !== undefined) user.displayName = input.displayName;
  if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
  if (input.capabilities !== undefined) user.set('capabilities', input.capabilities);
  if (input.homeArea !== undefined) {
    user.set('homeArea', {
      point: { type: 'Point', coordinates: input.homeArea.point.coordinates },
      label: input.homeArea.label,
    });
  }
  await user.save();
  return user;
}

// Apply a search-prefs patch (spec §9 PATCH /me/search-prefs). null clears a field.
export async function updateSearchPrefs(
  user: UserDocument,
  input: UpdateSearchPrefsInput,
): Promise<UserDocument> {
  const current = user.searchPrefs ?? {
    species: [],
    radiusKm: 3,
    available: false,
  };
  const next = { ...current } as Record<string, unknown>;

  if (input.species !== undefined) next.species = input.species;
  if (input.radiusKm !== undefined) next.radiusKm = input.radiusKm;
  if (input.available !== undefined) next.available = input.available;
  if (input.availableUntil !== undefined) {
    next.availableUntil = input.availableUntil ? new Date(input.availableUntil) : undefined;
  }
  if (input.quietHours !== undefined) {
    next.quietHours = input.quietHours ?? undefined;
  }

  user.set('searchPrefs', next);
  await user.save();
  return user;
}
