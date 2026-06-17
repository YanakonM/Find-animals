import type { SafeUser } from '@homeward/shared';

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

export const api = {
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
    req<AuthResponse>('/auth/line', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
  logout: () => req<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => req<AuthResponse>('/me'),
};
