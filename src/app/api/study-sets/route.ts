import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { studySets, flashcards, quizItems, activities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { generateSummary, generateFlashcards, generateQuiz, extractPDF, extractYouTube } from '@/lib/ai/engine';
import { randomUUID } from 'crypto';

const textSchema = z.object({ title: z.string().min(1), subjectId: z.string().optional(), sourceType: z.literal('text'), content: z.string().min(10) });
const ytSchema = z.object({ title: z.string().min(1), subjectId: z.string().optional(), sourceType: z.literal('youtube'), url: z.string().url() });

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await db.select().from(studySets).where(eq(studySets.userId, user.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  let title = '', subjectId: string | undefined, sourceType = '', content = '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    title = String(form.get('title') ?? '');
    subjectId = form.get('subjectId') as string | undefined;
    sourceType = 'pdf';
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    content = await extractPDF(buf);
  } else {
    const body = await req.json().catch(() => ({}));
    if (body.sourceType === 'youtube') {
      const p = ytSchema.safeParse(body);
      if (!p.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      title = p.data.title; subjectId = p.data.subjectId; sourceType = 'youtube';
      content = await extractYouTube(p.data.url);
    } else {
      const p = textSchema.safeParse(body);
      if (!p.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      title = p.data.title; subjectId = p.data.subjectId; sourceType = 'text'; content = p.data.content;
    }
  }

  const [summary, cards, quiz] = await Promise.all([
    generateSummary(content),
    generateFlashcards(content),
    generateQuiz(content),
  ]);

  const setId = randomUUID();
  const [row] = await db.insert(studySets).values({
    id: setId, userId: user.id, subjectId: subjectId ?? null,
    title, sourceType, sourceContent: content, summary,
  }).returning();

  if (cards.length) {
    await db.insert(flashcards).values(cards.map(c => ({
      id: randomUUID(), studySetId: setId, front: c.front, back: c.back,
    })));
  }
  if (quiz.length) {
    await db.insert(quizItems).values(quiz.map(q => ({
      id: randomUUID(), studySetId: setId, question: q.question,
      options: q.options, correctIndex: q.correctIndex, explanation: q.explanation,
    })));
  }

  await db.insert(activities).values({
    id: randomUUID(), userId: user.id, activityType: 'study_set_created',
    description: `Created study set "${title}"`,
  });

  return NextResponse.json(row, { status: 201 });
}
