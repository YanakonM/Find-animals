import type { Role, Capability } from '../enums.js';
import type { GeoPoint } from './geo.js';

// Fuzzed, public-safe home location (spec §8E). The precise home is stored
// server-side only and is NEVER part of any API-facing user shape.
export interface HomeArea {
  point: GeoPoint; // snapped to a ~500m grid + jitter
  label?: string; // e.g. "พฤกษา 116, รังสิต"
}

export interface QuietHours {
  start: string; // "21:00"
  end: string; // "07:00"
}

export interface SearchPrefs {
  species: string[]; // species to be alerted for ([] = all)
  radiusKm: number; // alert radius, default 3
  available: boolean; // "available to search now"
  availableUntil?: string; // ISO date; auto-expire availability
  quietHours?: QuietHours;
}

// `SafeUser` is the canonical user shape returned by the API (e.g. GET /me).
// It deliberately omits server-only fields: passwordHash and preciseHome.
export interface SafeUser {
  id: string;
  lineUserId?: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  roles: Role[];
  homeArea?: HomeArea;
  searchPrefs?: SearchPrefs;
  capabilities?: Capability[];
  capabilityVerified?: boolean;
  reputation: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
