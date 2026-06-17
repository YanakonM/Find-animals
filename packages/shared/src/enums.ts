// Domain enums shared across api & web (spec §6, §7).
// Roles are capabilities, not exclusive types — a user may hold several.

export const ROLES = [
  'owner',
  'eyes',
  'field_searcher',
  'specialist',
  'moderator',
  'admin',
] as const;
export type Role = (typeof ROLES)[number];

// Specialist capabilities (spec §7 User.capabilities).
export const CAPABILITIES = [
  'net',
  'ladder',
  'drone',
  'avian_vet',
  'climber',
  'transport',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// Default role every signed-in user receives (spec §6: `eyes`).
export const DEFAULT_ROLE: Role = 'eyes';
