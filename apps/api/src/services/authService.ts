import bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput } from '@homeward/shared';
import { User, type UserDocument } from '../models/User.js';
import { HttpError } from '../lib/httpError.js';
import type { LineProfile } from '../lib/lineVerifier.js';

const SALT_ROUNDS = 10;

export async function registerWithEmail(input: RegisterInput): Promise<UserDocument> {
  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) throw HttpError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return User.create({
    email: input.email,
    passwordHash,
    displayName: input.displayName,
    roles: ['eyes'],
  });
}

export async function loginWithEmail(input: LoginInput): Promise<UserDocument> {
  // passwordHash is select:false — request it explicitly for verification.
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.passwordHash) throw HttpError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw HttpError.unauthorized('Invalid credentials');
  return user;
}

// Find-or-create a user from a verified LINE profile (spec §4: stable lineUserId).
export async function loginWithLine(profile: LineProfile): Promise<UserDocument> {
  const existing = await User.findOne({ lineUserId: profile.lineUserId });
  if (existing) return existing;

  return User.create({
    lineUserId: profile.lineUserId,
    displayName: profile.displayName ?? 'LINE user',
    avatarUrl: profile.avatarUrl,
    email: profile.email,
    roles: ['eyes'],
  });
}
