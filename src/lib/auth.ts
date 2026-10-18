import { createHmac } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
import { userSessions, users } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

const COOKIE = 'cendekia_session';

function secretValue(): string {
  const configured = process.env.JWT_SECRET;
  if (!configured) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured in production');
    return 'dev-secret-change-me';
  }
  if (process.env.NODE_ENV === 'production' && configured.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  return configured;
}

const secret = () => new TextEncoder().encode(secretValue());

export function hashOtpCode(code: string): string {
  return createHmac('sha256', secretValue()).update(code).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
