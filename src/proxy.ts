import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function secret() {
  const configured = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) {
    throw new Error('A JWT_SECRET of at least 32 characters must be configured');
  }
  return new TextEncoder().encode(configured || 'dev-secret-change-me');
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('cendekia_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  try {
    await jwtVerify(token, secret());
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.set('cendekia_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return res;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/review/:path*', '/subjects/:path*', '/library/:path*', '/study/:path*', '/settings/:path*'],
};
