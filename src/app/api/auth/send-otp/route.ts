import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { otpCodes } from '@/lib/db/schema';
import { sendOtpEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { allowed } = checkRateLimit(ip, 'send-otp', 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { email, name } = parsed.data;
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpCodes).values({
    id: randomUUID(),
    email,
    code,
    action: 'login',
    name: name ?? null,
    ipAddress: ip,
    expiresAt,
  });

  await sendOtpEmail(email, code, name);
  return NextResponse.json({ success: true });
}
