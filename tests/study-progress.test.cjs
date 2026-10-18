'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DAILY_REVIEW_TARGET,
  calculateCurrentStreak,
  calculateUpdatedMastery,
  getUtcDateKey,
  sumCardsReviewedForDate,
} = require('../.test-build/study-progress-utils.js');

test('daily review target is a manageable ten cards', () => {
  assert.equal(DAILY_REVIEW_TARGET, 10);
});

test('mastery adapts to flashcard grades and quiz accuracy without leaving 0..1', () => {
  assert.equal(calculateUpdatedMastery(0, 1, 0.2), 0.2);
  assert.equal(calculateUpdatedMastery(0.5, 0, 0.2), 0.4);
  assert.equal(calculateUpdatedMastery(0.5, 1, 0.25), 0.625);
  assert.equal(calculateUpdatedMastery(2, 1), 1);
  assert.equal(calculateUpdatedMastery(-1, 0), 0);
});

test('streak counts consecutive study dates, tolerates an unfinished current day, and breaks on a missed day', () => {
  assert.equal(calculateCurrentStreak(['2026-10-18', '2026-10-17', '2026-10-16'], '2026-10-18'), 3);
  assert.equal(calculateCurrentStreak(['2026-10-17', '2026-10-16'], '2026-10-18'), 2);
  assert.equal(calculateCurrentStreak(['2026-10-16'], '2026-10-18'), 0);
  assert.equal(calculateCurrentStreak([], 'not-a-date'), 0);
});

test('UTC date key is stable and daily card counts are summed across log rows', () => {
  assert.equal(getUtcDateKey(new Date('2026-10-18T23:30:00.000Z')), '2026-10-18');
  assert.equal(sumCardsReviewedForDate([
    { date: '2026-10-18', cardsReviewed: 2 },
    { date: '2026-10-17', cardsReviewed: 9 },
    { date: '2026-10-18', cardsReviewed: 3 },
  ], '2026-10-18'), 5);
});
