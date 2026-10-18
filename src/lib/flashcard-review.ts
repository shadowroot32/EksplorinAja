import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { flashcards, studyLogs, studySets, subjects } from '@/lib/db/schema';
import { sm2 } from '@/lib/sm2';
import { calculateUpdatedMastery, getUtcDateKey } from '@/lib/study-progress-utils';

type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export async function reviewFlashcardForUser(
  userId: string,
  cardId: string,
  grade: Grade,
  studySetId?: string,
) {
  return db.transaction(async (tx) => {
    const conditions = [
      eq(flashcards.id, cardId),
      eq(studySets.userId, userId),
    ];
    if (studySetId) conditions.push(eq(studySets.id, studySetId));

    const [record] = await tx.select({
      id: flashcards.id,
      interval: flashcards.interval,
      easeFactor: flashcards.easeFactor,
      repetitions: flashcards.repetitions,
      subjectId: studySets.subjectId,
    })
      .from(flashcards)
      .innerJoin(studySets, eq(flashcards.studySetId, studySets.id))
      .where(and(...conditions))
      .limit(1);

    if (!record) return null;

    const schedule = sm2({
      interval: record.interval,
      easeFactor: record.easeFactor,
      repetitions: record.repetitions,
    }, grade);

    const [updated] = await tx.update(flashcards).set({
      interval: schedule.interval,
      easeFactor: schedule.easeFactor,
      repetitions: schedule.repetitions,
      dueDate: schedule.dueDate,
    }).where(eq(flashcards.id, record.id)).returning();

    if (record.subjectId) {
      const [subject] = await tx.select({ masteryLevel: subjects.masteryLevel })
        .from(subjects)
        .where(and(eq(subjects.id, record.subjectId), eq(subjects.userId, userId)))
        .limit(1);
      if (subject) {
        await tx.update(subjects).set({
          masteryLevel: calculateUpdatedMastery(subject.masteryLevel, grade / 5, 0.15),
        }).where(and(eq(subjects.id, record.subjectId), eq(subjects.userId, userId)));
      }
    }

    await tx.insert(studyLogs).values({
      id: randomUUID(),
      userId,
      date: getUtcDateKey(),
      cardsReviewed: 1,
      minutesStudied: 0,
    });

    return updated;
  });
}
