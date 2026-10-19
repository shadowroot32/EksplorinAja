export type Sm2Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface Sm2State {
  interval: number;
  easeFactor: number;
  repetitions: number;
}

/**
 * Schedule a flashcard using the SM-2 interval/ease-factor rules.
 * reviewedAt is injectable so scheduling stays deterministic in tests.
 */
export function sm2(
  card: Sm2State,
  grade: Sm2Grade,
  reviewedAt: Date = new Date(),
) {
  let interval = Number.isFinite(card.interval) && card.interval > 0
    ? Math.floor(card.interval)
    : 1;
  let easeFactor = Number.isFinite(card.easeFactor)
    ? Math.max(1.3, card.easeFactor)
    : 2.5;
  let repetitions = Number.isFinite(card.repetitions) && card.repetitions > 0
    ? Math.floor(card.repetitions)
    : 0;

  if (grade >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.max(1, Math.round(interval * easeFactor));
    repetitions += 1;
  } else {
    interval = 1;
    repetitions = 0;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02),
  );

  const dueDate = new Date(reviewedAt.getTime());
  dueDate.setUTCDate(dueDate.getUTCDate() + interval);

  return { interval, easeFactor, repetitions, dueDate };
}
