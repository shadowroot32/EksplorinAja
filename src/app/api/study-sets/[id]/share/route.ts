import { randomUUID } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { studySetShares, studySets } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { createShareToken, hashShareToken } from '@/lib/feature-utils';

const schema = z.object({
  expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select({ id: studySets.id }).from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid expiration period' }, { status: 400 });

  const token = createShareToken();
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  await db.insert(studySetShares).values({
    id: randomUUID(), studySetId: id, userId: user.id, tokenHash: hashShareToken(token), expiresAt,
  });
  const url = new URL('/share/' + token, req.nextUrl.origin).toString();
  return NextResponse.json({ url, expiresAt, expiresInDays: parsed.data.expiresInDays }, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select({ id: studySets.id }).from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.update(studySetShares).set({ revokedAt: new Date() }).where(and(
    eq(studySetShares.studySetId, id),
    eq(studySetShares.userId, user.id),
    isNull(studySetShares.revokedAt),
    gt(studySetShares.expiresAt, new Date()),
  ));
  return NextResponse.json({ success: true });
}
