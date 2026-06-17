// Pet passport (spec §7 BirdProfile). API-facing shape: string ids & ISO dates.

export const BIRD_STATUSES = ['home', 'lost', 'found_pending', 'reunited'] as const;
export type BirdStatus = (typeof BIRD_STATUSES)[number];

// Seed species list (spec §18 open decision) — used to populate UI pickers.
// The data model still accepts any free-form species string.
export const SEED_SPECIES = [
  'sun_conure',
  'green_cheek_conure',
  'crimson_bellied_conure',
  'indian_ringneck',
  'cockatiel',
  'african_grey',
  'macaw',
] as const;

export interface LegRing {
  number: string; // raw, as read
  normalized: string; // uppercased, alphanumerics only — UNIQUE key
  breederCode?: string;
  year?: number;
}

export interface BirdProfile {
  id: string;
  ownerId: string;
  name: string;
  category: 'bird';
  species: string;
  morphColor?: string;
  legRing?: LegRing;
  microchipId?: string;
  photos: string[]; // first = primary
  distinguishingMarks?: string;
  soundsWords?: string[];
  temperament?: string;
  status: BirdStatus;
  createdAt: string;
  updatedAt: string;
}
