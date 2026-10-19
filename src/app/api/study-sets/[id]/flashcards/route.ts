import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { flashcards, studySets } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { reviewFlashcardForUser } from '@/lib/flashcard-review';

const reviewSchema = z.object({
  cardId: z.string().min(1).max(200),
  grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [studySet] = await db.select({ id: studySets.id })
    .from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id)))
    .limit(1);
  if (!studySet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rows = await db.select().from(flashcards).where(eq(flashcards.studySetId, id));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const updated = await reviewFlashcardForUser(user.id, parsed.data.cardId, parsed.data.grade, id);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
