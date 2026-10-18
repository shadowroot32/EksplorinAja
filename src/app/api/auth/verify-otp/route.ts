import { randomUUID } from 'crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { otpCodes, users } from '@/lib/db/schema';
import { createSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and 6-digit code.' }, { status: 400 });

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const { allowed } = checkRateLimit(ip, 'verify-otp', 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 });

  const { email, code, name } = parsed.data;
  const now = new Date();
  const [otp] = await db.select().from(otpCodes).where(and(
    eq(otpCodes.email, email),
    eq(otpCodes.code, code),
    eq(otpCodes.action, 'login'),
    isNull(otpCodes.usedAt),
    gt(otpCodes.expiresAt, now),
  )).orderBy(desc(otpCodes.createdAt)).limit(1);

  if (!otp) return NextResponse.json({ error: 'That code is invalid or has expired. Request a new one and try again.' }, { status: 401 });

  // Conditional update prevents the same code from being consumed by parallel verify requests.
  const [consumed] = await db.update(otpCodes).set({ usedAt: now }).where(and(
    eq(otpCodes.id, otp.id),
    isNull(otpCodes.usedAt),
    gt(otpCodes.expiresAt, now),
  )).returning({ id: otpCodes.id });

  if (!consumed) return NextResponse.json({ error: 'That code has already been used or has expired. Request a new one.' }, { status: 401 });

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
    const [first, ...rest] = parts;
    await db.insert(users).values({
      id: randomUUID(), email, firstName: first ?? '', lastName: rest.join(' '),
    }).onConflictDoNothing();
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  }

  if (!user) return NextResponse.json({ error: 'We could not finish signing you in. Please request a new code.' }, { status: 500 });

  const token = await createSession(user.id);
  const response = NextResponse.json({ success: true, userId: user.id });
  response.cookies.set('cendekia_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
