import { NextRequest, NextResponse } from 'next/server';
import {
  createCodeChallenge,
  createCodeVerifier,
  createOpaqueToken,
  resolveGoogleRedirectUri,
} from '@/lib/google-oauth-utils';

const CALLBACK_PATH = '/api/auth/google/callback';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: CALLBACK_PATH,
  maxAge: 10 * 60,
};

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = resolveGoogleRedirectUri(request.nextUrl.origin);

  if (!clientId || !clientSecret || !redirectUri) {
    return loginRedirect(request, 'google_not_configured');
  }

  const state = createOpaqueToken();
  const nonce = createOpaqueToken();
  const verifier = createCodeVerifier();

  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('nonce', nonce);
  authorizationUrl.searchParams.set('code_challenge', createCodeChallenge(verifier));
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set('google_oauth_state', state, COOKIE_OPTIONS);
  response.cookies.set('google_oauth_nonce', nonce, COOKIE_OPTIONS);
  response.cookies.set('google_oauth_verifier', verifier, COOKIE_OPTIONS);
  return response;
}
