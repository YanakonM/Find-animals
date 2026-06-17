// Identity normalization (spec §8A). Shared so the client can preview the
// normalized ring before submitting, and the server stores/queries consistently.

// Uppercase, strip everything that isn't A–Z or 0–9.
export function normalizeRing(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Microchips are digits, but normalize defensively the same way.
export function normalizeMicrochip(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
