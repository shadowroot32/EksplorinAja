export function sm2(
  card: { interval: number; easeFactor: number; repetitions: number },
  grade: 0 | 1 | 2 | 3 | 4 | 5,
) {
  let { interval, easeFactor, repetitions } = card;
  if (grade >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    interval = 1;
    repetitions = 0;
  }
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02),
  );
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  return { interval, easeFactor, repetitions, dueDate };
}
