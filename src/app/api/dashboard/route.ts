import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subjects, studySets, flashcards, activities, studyLogs } from '@/lib/db/schema';
import { eq, lte, desc, and, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [
    userSubjects,
    userStudySets,
    dueCards,
    recentActivities,
    todayLog,
  ] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.userId, user.id)),
    db.select().from(studySets).where(eq(studySets.userId, user.id)).orderBy(desc(studySets.createdAt)).limit(5),
    db.select().from(flashcards)
      .where(lte(flashcards.dueDate, now))
      .limit(100),
    db.select().from(activities).where(eq(activities.userId, user.id)).orderBy(desc(activities.createdAt)).limit(10),
    db.select().from(studyLogs).where(and(eq(studyLogs.userId, user.id), eq(studyLogs.date, todayStr))).limit(1),
  ]);

  const masteryAvg = userSubjects.length
    ? userSubjects.reduce((s, sub) => s + sub.masteryLevel, 0) / userSubjects.length
    : 0;

  return NextResponse.json({
    stats: {
      subjects: userSubjects.length,
      studySets: userStudySets.length,
      dueCards: dueCards.length,
      mastery: Math.round(masteryAvg * 100),
      minutesToday: todayLog[0]?.minutesStudied ?? 0,
    },
    recentSets: userStudySets,
    subjects: userSubjects,
    activities: recentActivities,
  });
}
