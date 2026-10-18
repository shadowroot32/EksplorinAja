import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { cornellNotes, studySets } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';

const schema = z.object({
  cues: z.string().max(12_000),
  notes: z.string().max(20_000),
  summary: z.string().max(8_000),
  reflection: z.string().max(8_000),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select({ id: studySets.id }).from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [notes] = await db.select().from(cornellNotes)
    .where(and(eq(cornellNotes.studySetId, id), eq(cornellNotes.userId, user.id))).limit(1);
  return NextResponse.json(notes ?? { studySetId: id, cues: '', notes: '', summary: '', reflection: '', updatedAt: null });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select({ id: studySets.id }).from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Cornell note fields' }, { status: 400 });
  const [saved] = await db.insert(cornellNotes).values({
    id: randomUUID(), studySetId: id, userId: user.id, ...parsed.data, updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: cornellNotes.studySetId,
    set: { ...parsed.data, userId: user.id, updatedAt: new Date() },
  }).returning();
  return NextResponse.json(saved);
}
