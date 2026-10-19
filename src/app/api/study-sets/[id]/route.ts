import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { studySets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { MAX_SOURCE_CHARS } from '@/lib/ai/material-validation';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  sourceContent: z.string().trim().min(10).max(MAX_SOURCE_CHARS).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [row] = await db.select().from(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid document fields' }, { status: 400 });

  const [existing] = await db.select({ id: studySets.id }).from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [updated] = await db.update(studySets).set(parsed.data)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).returning();
  if (!updated) return NextResponse.json({ error: 'Could not save document' }, { status: 500 });
  return NextResponse.json(updated, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await db.delete(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, user.id)));
  return NextResponse.json({ success: true });
}
