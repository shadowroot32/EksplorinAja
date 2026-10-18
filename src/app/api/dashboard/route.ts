import { count, and, desc, eq, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subjects, studySets, flashcards, activities, studyLogs } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { calculateCurrentStreak, getUtcDateKey, sumCardsReviewedForDate } from '@/lib/study-progress-utils';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const todayStr = getUtcDateKey(now);

  const [
    userSubjects,
    userStudySets,
    studySetCountRows,
    dueCountRows,
    recentActivities,
    todayLogs,
    activeDates,
  ] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.userId, user.id)),
    db.select().from(studySets).where(eq(studySets.userId, user.id)).orderBy(desc(studySets.createdAt)).limit(5),
    db.select({ total: count() }).from(studySets).where(eq(studySets.userId, user.id)),
    db.select({ total: count() }).from(flashcards)
      .innerJoin(studySets, eq(flashcards.studySetId, studySets.id))
      .where(and(eq(studySets.userId, user.id), lte(flashcards.dueDate, now))),
    db.select().from(activities).where(eq(activities.userId, user.id)).orderBy(desc(activities.createdAt)).limit(10),
    db.select({ date: studyLogs.date, cardsReviewed: studyLogs.cardsReviewed })
      .from(studyLogs).where(and(eq(studyLogs.userId, user.id), eq(studyLogs.date, todayStr))),
    db.selectDistinct({ date: studyLogs.date })
      .from(studyLogs)
      .where(eq(studyLogs.userId, user.id))
      .orderBy(desc(studyLogs.date))
      .limit(400),
  ]);

  const masteryAvg = userSubjects.length
    ? userSubjects.reduce((sum, subject) => sum + subject.masteryLevel, 0) / userSubjects.length
    : 0;
  const cardsReviewedToday = sumCardsReviewedForDate(
    todayLogs.map((log) => ({ date: String(log.date), cardsReviewed: log.cardsReviewed })),
    todayStr,
  );

  return NextResponse.json({
    stats: {
      subjects: userSubjects.length,
      studySets: Number(studySetCountRows[0]?.total ?? 0),
      dueCards: Number(dueCountRows[0]?.total ?? 0),
      mastery: Math.round(masteryAvg * 100),
      cardsReviewedToday,
      streakDays: calculateCurrentStreak(activeDates.map((row) => String(row.date)), todayStr),
    },
    recentSets: userStudySets,
    subjects: userSubjects,
    activities: recentActivities,
  });
}
