import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface OAuthEnvironment {
  GOOGLE_REDIRECT_URI?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function createCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function createCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeOAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveGoogleRedirectUri(
  requestOrigin: string,
  env: OAuthEnvironment = process.env,
): string | null {
  const explicit = env.GOOGLE_REDIRECT_URI?.trim();
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  let redirect: URL;

  try {
    if (explicit) redirect = new URL(explicit);
    else if (appUrl) redirect = new URL('/api/auth/google/callback', appUrl);
    else if (env.NODE_ENV !== 'production') redirect = new URL('/api/auth/google/callback', requestOrigin);
    else return null;
  } catch {
    return null;
  }

  if (redirect.username || redirect.password) return null;
  if (redirect.pathname !== '/api/auth/google/callback' || redirect.search || redirect.hash) return null;
  if (env.NODE_ENV === 'production' && redirect.protocol !== 'https:') return null;
  if (redirect.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && redirect.hostname === 'localhost' && redirect.protocol === 'http:')) return null;

  return redirect.toString();
}
