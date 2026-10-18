import { createHmac, randomInt } from 'crypto';

export function generateOtp(): string {
  return String(randomInt(100000, 1_000_000));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashOtp(code: string, secret: string): string {
  if (!secret) throw new Error('A non-empty secret is required to hash OTP codes');
  return createHmac('sha256', secret).update(code).digest('hex');
}
