import type { SafeUser, BirdProfile, CreateBirdInput } from '@homeward/shared';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include', // send/receive the httpOnly session cookie
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

interface AuthResponse {
  user: SafeUser;
}

export interface RingLookupResult {
  found: boolean;
  bird?: { name: string; species: string; status: string; ring: string; primaryPhoto?: string };
}

export const api = {
  // ── auth ──
  register: (email: string, password: string, displayName: string) =>
    req<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email: string, password: string) =>
    req<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  lineLogin: (idToken: string) =>
    req<AuthResponse>('/auth/line', { method: 'POST', body: JSON.stringify({ idToken }) }),
  logout: () => req<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => req<AuthResponse>('/me'),

  // ── birds ──
  listMyBirds: () => req<{ birds: BirdProfile[] }>('/birds?owner=me'),
  createBird: (input: CreateBirdInput) =>
    req<{ bird: BirdProfile }>('/birds', { method: 'POST', body: JSON.stringify(input) }),
  generatePoster: (id: string, opts: { mode?: 'registered' | 'lost'; contact?: string }) =>
    req<{ posterUrl: string }>(`/birds/${id}/poster`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
  lookupRing: (ring: string) =>
    req<RingLookupResult>(`/birds/lookup?ring=${encodeURIComponent(ring)}`),

  // multipart upload — do NOT set content-type (browser sets the boundary).
  uploadImage: async (file: File): Promise<{ url: string; publicId: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/uploads/image`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return res.json() as Promise<{ url: string; publicId: string }>;
  },
};
