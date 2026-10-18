import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { flashcards } from '@/lib/db/schema';
import { eq, lte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { sm2 } from '@/lib/sm2';

const reviewSchema = z.object({ cardId: z.string(), grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const rows = await db.select().from(flashcards).where(eq(flashcards.studySetId, id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { cardId, grade } = parsed.data;
  const [card] = await db.select().from(flashcards).where(eq(flashcards.id, cardId)).limit(1);
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = sm2({ interval: card.interval, easeFactor: card.easeFactor, repetitions: card.repetitions }, grade);
  const [updated] = await db.update(flashcards).set({
    interval: result.interval,
    easeFactor: result.easeFactor,
    repetitions: result.repetitions,
    dueDate: result.dueDate,
  }).where(eq(flashcards.id, cardId)).returning();

  return NextResponse.json(updated);
}
