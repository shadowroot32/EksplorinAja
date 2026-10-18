export const DAILY_REVIEW_TARGET = 10;

export function getUtcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function calculateUpdatedMastery(
  currentMastery: number,
  observedScore: number,
  weight = 0.2,
): number {
  const current = Number.isFinite(currentMastery) ? Math.min(1, Math.max(0, currentMastery)) : 0;
  const observed = Number.isFinite(observedScore) ? Math.min(1, Math.max(0, observedScore)) : 0;
  const safeWeight = Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : 0.2;
  return Math.round((current + (observed - current) * safeWeight) * 1000) / 1000;
}

export function calculateCurrentStreak(activityDates: string[], today = getUtcDateKey()): number {
  const activeDates = new Set(activityDates);
  const parseDate = (value: string) => new Date(value + 'T00:00:00.000Z');
  const todayDate = parseDate(today);
  if (Number.isNaN(todayDate.getTime())) return 0;

  let cursor = new Date(todayDate);
  if (!activeDates.has(getUtcDateKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!activeDates.has(getUtcDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (activeDates.has(getUtcDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function sumCardsReviewedForDate(
  logs: Array<{ date: string; cardsReviewed: number }>,
  date: string,
): number {
  return logs.reduce((total, log) => (
    log.date === date ? total + Math.max(0, Number(log.cardsReviewed) || 0) : total
  ), 0);
}
