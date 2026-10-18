import { randomUUID } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { normalizeOAuthEmail, resolveGoogleRedirectUri, safeStringEqual } from '@/lib/google-oauth-utils';

export const dynamic = 'force-dynamic';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const CALLBACK_PATH = '/api/auth/google/callback';
const OAUTH_COOKIES = ['google_oauth_state', 'google_oauth_nonce', 'google_oauth_verifier'] as const;

function clearOAuthCookies(response: NextResponse) {
  for (const name of OAUTH_COOKIES) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: CALLBACK_PATH,
      maxAge: 0,
    });
  }
}

function loginFailure(request: NextRequest, error: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error);
  const response = NextResponse.redirect(url);
  clearOAuthCookies(response);
  return response;
}

interface GoogleTokenResponse {
  id_token?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const returnedState = params.get('state') ?? '';
  const storedState = request.cookies.get('google_oauth_state')?.value ?? '';
  const nonce = request.cookies.get('google_oauth_nonce')?.value ?? '';
  const verifier = request.cookies.get('google_oauth_verifier')?.value ?? '';

  if (!returnedState || !storedState || !nonce || !verifier || !safeStringEqual(returnedState, storedState)) {
    return loginFailure(request, 'google_invalid_state');
  }
  if (params.get('error')) return loginFailure(request, 'google_cancelled');

  const code = params.get('code');
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = resolveGoogleRedirectUri(request.nextUrl.origin);
  if (!code || !clientId || !clientSecret || !redirectUri) {
    return loginFailure(request, 'google_not_configured');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      cache: 'no-store',
    });
    const tokenData = await tokenResponse.json().catch(() => ({})) as GoogleTokenResponse;
    if (!tokenResponse.ok || typeof tokenData.id_token !== 'string') {
      console.error('[AUTH GOOGLE] Token exchange was rejected by Google.');
      return loginFailure(request, 'google_auth_failed');
    }

    const { payload } = await jwtVerify(tokenData.id_token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
      algorithms: ['RS256'],
    });

    if (typeof payload.nonce !== 'string' || !safeStringEqual(payload.nonce, nonce)) {
      return loginFailure(request, 'google_invalid_state');
    }

    const emailClaim = typeof payload.email === 'string' ? payload.email : '';
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!emailClaim || !emailVerified) return loginFailure(request, 'google_email_unverified');

    const email = normalizeOAuthEmail(emailClaim);
    const fullName = typeof payload.name === 'string' ? payload.name.trim() : '';
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const firstName = typeof payload.given_name === 'string' ? payload.given_name.trim() : (nameParts[0] ?? '');
    const lastName = typeof payload.family_name === 'string' ? payload.family_name.trim() : nameParts.slice(1).join(' ');
    const avatarUrl = typeof payload.picture === 'string' && payload.picture.startsWith('https://')
      ? payload.picture
      : null;

    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      await db.insert(users).values({
        id: randomUUID(),
        email,
        firstName,
        lastName,
        avatarUrl,
      }).onConflictDoNothing();
      [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    } else if (avatarUrl && user.avatarUrl !== avatarUrl) {
      await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id));
    }

    if (!user) return loginFailure(request, 'google_auth_failed');

    const sessionToken = await createSession(user.id);
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('cendekia_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error('[AUTH GOOGLE] Callback failed:', error instanceof Error ? error.name : 'UnknownError');
    return loginFailure(request, 'google_auth_failed');
  }
}
