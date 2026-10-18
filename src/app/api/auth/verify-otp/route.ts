import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { otpCodes, users } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { createSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = checkRateLimit(ip, 'verify-otp', 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { email, code, name } = parsed.data;
  const now = new Date();

  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email),
        eq(otpCodes.code, code),
        isNull(otpCodes.usedAt),
        gt(otpCodes.expiresAt, now),
      ),
    )
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!otp) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });

  await db.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, otp.id));

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    const parts = name?.trim().split(' ') ?? [];
    const [first, ...rest] = parts;
    const id = randomUUID();
    await db.insert(users).values({
      id,
      email,
      firstName: first ?? '',
      lastName: rest.join(' '),
    });
    [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  }

  const token = await createSession(user.id);
  const response = NextResponse.json({ success: true, userId: user.id });
  // set cookie directly on response for API routes
  response.cookies.set('cendekia_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
