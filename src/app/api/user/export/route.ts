import { inArray, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  activities,
  chatMessages,
  cornellNotes,
  flashcards,
  podcasts,
  quizItems,
  studyLogs,
  studySetShares,
  studySets,
  subjects,
} from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [ownedSubjects, ownedStudySets, logs, activityRows, chatRows, shareRows] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.userId, user.id)),
    db.select().from(studySets).where(eq(studySets.userId, user.id)),
    db.select().from(studyLogs).where(eq(studyLogs.userId, user.id)),
    db.select().from(activities).where(eq(activities.userId, user.id)),
    db.select().from(chatMessages).where(eq(chatMessages.userId, user.id)),
    db.select({
      id: studySetShares.id,
      studySetId: studySetShares.studySetId,
      expiresAt: studySetShares.expiresAt,
      revokedAt: studySetShares.revokedAt,
      createdAt: studySetShares.createdAt,
    }).from(studySetShares).where(eq(studySetShares.userId, user.id)),
  ]);

  const studySetIds = ownedStudySets.map((studySet) => studySet.id);
  const [ownedFlashcards, ownedQuizzes, ownedPodcasts, ownedCornellNotes] = studySetIds.length
    ? await Promise.all([
      db.select().from(flashcards).where(inArray(flashcards.studySetId, studySetIds)),
      db.select().from(quizItems).where(inArray(quizItems.studySetId, studySetIds)),
      db.select().from(podcasts).where(inArray(podcasts.studySetId, studySetIds)),
      db.select().from(cornellNotes).where(inArray(cornellNotes.studySetId, studySetIds)),
    ])
    : [[], [], [], []];

  const exportedAt = new Date().toISOString();
  const payload = {
    format: 'cendekia-ai-export',
    version: 1,
    exportedAt,
    account: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      school: user.school,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    subjects: ownedSubjects,
    studySets: ownedStudySets,
    flashcards: ownedFlashcards,
    quizzes: ownedQuizzes,
    cornellNotes: ownedCornellNotes,
    podcasts: ownedPodcasts,
    chatMessages: chatRows,
    studyLogs: logs,
    activities: activityRows,
    shares: shareRows,
  };

  const date = exportedAt.slice(0, 10);
  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': `attachment; filename="cendekia-ai-export-${date}.json"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
