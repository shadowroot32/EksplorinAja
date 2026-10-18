import { and, asc, eq, gt, lte, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { flashcards, studySets, subjects } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { reviewFlashcardForUser } from '@/lib/flashcard-review';

const reviewSchema = z.object({
  cardId: z.string().min(1).max(200),
  grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});
const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cursorDueDateRaw = req.nextUrl.searchParams.get('cursorDueDate');
  const cursorId = req.nextUrl.searchParams.get('cursorId');
  if (Boolean(cursorDueDateRaw) !== Boolean(cursorId)) {
    return NextResponse.json({ error: 'Invalid pagination cursor' }, { status: 400 });
  }

  const filters = [
    eq(studySets.userId, user.id),
    lte(flashcards.dueDate, new Date()),
  ];
  if (cursorDueDateRaw && cursorId) {
    const cursorDueDate = new Date(cursorDueDateRaw);
    if (Number.isNaN(cursorDueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid pagination cursor' }, { status: 400 });
    }
    filters.push(or(
      gt(flashcards.dueDate, cursorDueDate),
      and(eq(flashcards.dueDate, cursorDueDate), gt(flashcards.id, cursorId)),
    )!);
  }

  const rows = await db.select({
    id: flashcards.id,
    studySetId: studySets.id,
    studySetTitle: studySets.title,
    subjectName: subjects.name,
    front: flashcards.front,
    back: flashcards.back,
    dueDate: flashcards.dueDate,
  })
    .from(flashcards)
    .innerJoin(studySets, eq(flashcards.studySetId, studySets.id))
    .leftJoin(subjects, eq(studySets.subjectId, subjects.id))
    .where(and(...filters))
    .orderBy(asc(flashcards.dueDate), asc(flashcards.id))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const cards = rows.slice(0, PAGE_SIZE);
  const lastCard = cards[cards.length - 1];
  const nextCursor = hasMore && lastCard
    ? { dueDate: lastCard.dueDate.toISOString(), id: lastCard.id }
    : null;

  return NextResponse.json({ cards, nextCursor, pageSize: PAGE_SIZE });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const updated = await reviewFlashcardForUser(user.id, parsed.data.cardId, parsed.data.grade);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ card: updated });
}
