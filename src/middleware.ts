import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('cendekia_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  try {
    await jwtVerify(token, secret());
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('cendekia_session');
    return res;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/subjects/:path*', '/library/:path*', '/study/:path*', '/settings/:path*'],
};
