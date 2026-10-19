import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { activities, quizItems, studyLogs, studySets, subjects } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { calculateUpdatedMastery, getUtcDateKey } from '@/lib/study-progress-utils';

const answersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1).max(200),
    selectedIndex: z.number().int().min(0).max(3),
  })).min(1).max(100),
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

  // Do not expose the answer key or explanations before grading on the server.
  const rows = await db.select({
    id: quizItems.id,
    question: quizItems.question,
    options: quizItems.options,
  }).from(quizItems).where(eq(quizItems.studySetId, id));
  return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = answersSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const [studySet] = await db.select({
    id: studySets.id,
    title: studySets.title,
    subjectId: studySets.subjectId,
  }).from(studySets).where(and(
    eq(studySets.id, id),
    eq(studySets.userId, user.id),
  )).limit(1);
  if (!studySet) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const questions = await db.select().from(quizItems).where(eq(quizItems.studySetId, id));
  if (!questions.length) return NextResponse.json({ error: 'No quiz questions found' }, { status: 422 });
  if (parsed.data.answers.length !== questions.length) {
    return NextResponse.json({ error: 'Submit an answer for every question exactly once' }, { status: 400 });
  }

  const answerMap = new Map<string, number>();
  for (const answer of parsed.data.answers) {
    if (answerMap.has(answer.questionId)) {
      return NextResponse.json({ error: 'Duplicate question answer' }, { status: 400 });
    }
    answerMap.set(answer.questionId, answer.selectedIndex);
  }
  if (questions.some((question) => !answerMap.has(question.id))) {
    return NextResponse.json({ error: 'Answer set does not match this quiz' }, { status: 400 });
  }

  const results = questions.map((question) => {
    const selectedIndex = answerMap.get(question.id)!;
    return {
      questionId: question.id,
      selectedIndex,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      isCorrect: selectedIndex === question.correctIndex,
    };
  });
  const correctCount = results.filter((result) => result.isCorrect).length;
  const score = correctCount / questions.length;

  await db.transaction(async (tx) => {
    if (studySet.subjectId) {
      const [subject] = await tx.select({ masteryLevel: subjects.masteryLevel })
        .from(subjects)
        .where(and(eq(subjects.id, studySet.subjectId), eq(subjects.userId, user.id)))
        .limit(1);
      if (subject) {
        await tx.update(subjects).set({
          masteryLevel: calculateUpdatedMastery(subject.masteryLevel, score, 0.25),
        }).where(and(eq(subjects.id, studySet.subjectId!), eq(subjects.userId, user.id)));
      }
    }

    // One log row marks this completed quiz as a study day; it does not increase card-review progress.
    await tx.insert(studyLogs).values({
      id: randomUUID(),
      userId: user.id,
      date: getUtcDateKey(),
      cardsReviewed: 0,
      minutesStudied: 0,
    });
    await tx.insert(activities).values({
      id: randomUUID(),
      userId: user.id,
      activityType: 'quiz_completed',
      description: 'Completed a quiz: ' + studySet.title + ' (' + correctCount + '/' + questions.length + ')',
    });
  });

  return NextResponse.json({
    score: correctCount,
    total: questions.length,
    percentage: Math.round(score * 100),
    results,
  });
}
