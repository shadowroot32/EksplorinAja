import { inArray, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { flashcards, quizItems, studyLogs, studySets } from '@/lib/db/schema';

type CsvValue = string | number | Date | null | undefined;

function csvCell(value: CsvValue): string {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  // Spreadsheet programs may execute cells beginning with formula markers.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvResponse(type: string, rows: CsvValue[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="eksplorinaja-${type}-${date}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const type = request.nextUrl.searchParams.get('type') ?? 'flashcards';
  if (!['flashcards', 'quizzes', 'progress'].includes(type)) {
    return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 });
  }

  if (type === 'progress') {
    const logs = await db.select().from(studyLogs).where(eq(studyLogs.userId, user.id));
    return csvResponse(type, [
      ['date', 'minutes_studied', 'cards_reviewed'],
      ...logs.map((log) => [log.date, log.minutesStudied, log.cardsReviewed]),
    ]);
  }

  const sets = await db.select({ id: studySets.id, title: studySets.title })
    .from(studySets).where(eq(studySets.userId, user.id));
  if (sets.length === 0) {
    return csvResponse(type, [type === 'flashcards'
      ? ['study_set', 'front', 'back', 'interval_days', 'ease_factor', 'repetitions', 'due_date']
      : ['study_set', 'question', 'options', 'correct_option_index', 'explanation']]);
  }

  const ids = sets.map((set) => set.id);
  const titleBySet = new Map(sets.map((set) => [set.id, set.title]));

  if (type === 'flashcards') {
    const rows = await db.select().from(flashcards).where(inArray(flashcards.studySetId, ids));
    return csvResponse(type, [
      ['study_set', 'front', 'back', 'interval_days', 'ease_factor', 'repetitions', 'due_date'],
      ...rows.map((card) => [
        titleBySet.get(card.studySetId), card.front, card.back, card.interval,
        card.easeFactor, card.repetitions, card.dueDate,
      ]),
    ]);
  }

  const rows = await db.select().from(quizItems).where(inArray(quizItems.studySetId, ids));
  return csvResponse(type, [
    ['study_set', 'question', 'options', 'correct_option_index', 'explanation'],
    ...rows.map((item) => [
      titleBySet.get(item.studySetId), item.question, item.options.join(' | '),
      item.correctIndex, item.explanation,
    ]),
  ]);
}
