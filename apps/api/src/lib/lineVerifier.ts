import { env, lineConfigured } from '../config/env.js';
import { logger } from '../config/logger.js';

// Identity extracted from a verified LINE id_token.
export interface LineProfile {
  lineUserId: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

export interface LineVerifier {
  readonly mode: 'real' | 'stub';
  verify(idToken: string): Promise<LineProfile>;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * DEV STUB — active when no LINE channel is configured.
 * Accepts either a JWT-shaped token (reads sub/name/picture/email claims) or any
 * plain string (used directly as the LINE user id). NEVER enable in production.
 */
class StubLineVerifier implements LineVerifier {
  readonly mode = 'stub' as const;
  async verify(idToken: string): Promise<LineProfile> {
    const claims = decodeJwtPayload(idToken);
    if (claims && typeof claims.sub === 'string') {
      return {
        lineUserId: claims.sub,
        displayName: typeof claims.name === 'string' ? claims.name : undefined,
        avatarUrl: typeof claims.picture === 'string' ? claims.picture : undefined,
        email: typeof claims.email === 'string' ? claims.email : undefined,
      };
    }
    const raw = idToken.trim();
    if (!raw) throw new Error('Empty LINE id token');
    return { lineUserId: `stub:${raw}` };
  }
}

/**
 * REAL verifier — verifies the id_token via LINE's official endpoint and checks
 * the audience matches our channel id. Used automatically once LINE_CHANNEL_ID
 * is set. (Untested in Phase 0 — no credentials — but the path is wired.)
 */
class RealLineVerifier implements LineVerifier {
  readonly mode = 'real' as const;
  async verify(idToken: string): Promise<LineProfile> {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_CHANNEL_ID ?? '' }),
    });
    if (!res.ok) {
      throw new Error(`LINE verify failed (${res.status})`);
    }
    const data = (await res.json()) as {
      sub?: string;
      name?: string;
      picture?: string;
      email?: string;
    };
    if (!data.sub) throw new Error('LINE verify returned no subject');
    return {
      lineUserId: data.sub,
      displayName: data.name,
      avatarUrl: data.picture,
      email: data.email,
    };
  }
}

export const lineVerifier: LineVerifier = lineConfigured
  ? new RealLineVerifier()
  : new StubLineVerifier();

logger.info({ mode: lineVerifier.mode }, 'line verifier initialised');
