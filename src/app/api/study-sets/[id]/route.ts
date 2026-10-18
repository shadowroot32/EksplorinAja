import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studySets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [row] = await db.select().from(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await db.delete(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, user.id)));
  return NextResponse.json({ success: true });
}
