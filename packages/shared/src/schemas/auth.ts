import { z } from 'zod';

// Email/password fallback (spec §4: "email/password fallback").
export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

// LINE Login (spec §9: POST /auth/line). The client obtains an id_token from
// the LIFF SDK and exchanges it here for a server session.
export const lineLoginSchema = z.object({
  idToken: z.string().min(1),
});
export type LineLoginInput = z.infer<typeof lineLoginSchema>;
