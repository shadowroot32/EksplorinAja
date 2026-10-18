import { randomInt, randomUUID } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { otpCodes } from '@/lib/db/schema';
import { sendOtpEmail, isSmtpConfigured } from '@/lib/email';
import { hashOtpCode } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  name: z.string().trim().max(100).optional(),
});

function generateOtp(): string {
  return String(randomInt(100000, 1_000_000));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const { allowed: ipAllowed } = checkRateLimit(ip, 'send-otp', 5, 60_000);
  if (!ipAllowed) return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 });

  const { email, name } = parsed.data;
  const { allowed: emailAllowed } = checkRateLimit(email, 'send-otp-email', 3, 10 * 60_000);
  if (!emailAllowed) return NextResponse.json({ error: 'Too many codes requested for this address. Please wait 10 minutes.' }, { status: 429 });

  if (!isSmtpConfigured()) {
    return NextResponse.json({
      error: 'Email delivery is not configured on the server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.',
    }, { status: 503 });
  }

  const id = randomUUID();
  const code = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  let stored = false;

  try {
    await db.insert(otpCodes).values({
      id, email, code: hashOtpCode(code), action: 'login', name: name || null, ipAddress: ip, expiresAt,
    });
    stored = true;
    await sendOtpEmail(email, code, name);
  } catch (error) {
    if (stored) {
      try {
        await db.update(otpCodes).set({ usedAt: new Date() })
          .where(and(eq(otpCodes.id, id), isNull(otpCodes.usedAt)));
      } catch {
        // Keep the delivery failure response even if invalidating the code also fails.
      }
    }
    console.error('[AUTH OTP] Email delivery failed:', error instanceof Error ? { name: error.name, code: ('code' in error && typeof error.code === 'string') ? error.code : undefined, message: error.message.slice(0, 240) } : 'UnknownError');
    return NextResponse.json({
      error: 'We could not deliver your verification code. Check the email address and SMTP provider settings, then try again.',
    }, { status: 502 });
  }

  return NextResponse.json({ success: true, message: 'Verification code sent.' });
}
