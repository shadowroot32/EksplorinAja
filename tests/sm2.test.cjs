'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sm2 } = require('../.test-build/sm2.js');

const reviewedAt = new Date('2026-10-20T12:00:00.000Z');

test('first successful recall schedules one day and increments repetitions', () => {
  const result = sm2({ interval: 1, easeFactor: 2.5, repetitions: 0 }, 4, reviewedAt);
  assert.equal(result.interval, 1);
  assert.equal(result.repetitions, 1);
  assert.equal(result.easeFactor, 2.5);
  assert.equal(result.dueDate.toISOString(), '2026-10-21T12:00:00.000Z');
});

test('second successful recall schedules six days', () => {
  const result = sm2({ interval: 1, easeFactor: 2.5, repetitions: 1 }, 5, reviewedAt);
  assert.equal(result.interval, 6);
  assert.equal(result.repetitions, 2);
  assert.equal(result.dueDate.toISOString(), '2026-10-26T12:00:00.000Z');
});

test('later successful recalls multiply the previous interval by ease factor', () => {
  const result = sm2({ interval: 10, easeFactor: 2.5, repetitions: 2 }, 4, reviewedAt);
  assert.equal(result.interval, 25);
  assert.equal(result.repetitions, 3);
});

test('grades below three reset repetitions and schedule a retry tomorrow', () => {
  for (const grade of [0, 1, 2]) {
    const result = sm2({ interval: 12, easeFactor: 2.1, repetitions: 4 }, grade, reviewedAt);
    assert.equal(result.interval, 1);
    assert.equal(result.repetitions, 0);
    assert.equal(result.dueDate.toISOString(), '2026-10-21T12:00:00.000Z');
  }
});

test('ease factor never falls below the SM-2 minimum of 1.3', () => {
  const result = sm2({ interval: 5, easeFactor: 1.3, repetitions: 3 }, 0, reviewedAt);
  assert.equal(result.easeFactor, 1.3);
});

test('invalid stored scheduling values are normalized instead of producing invalid dates', () => {
  const result = sm2({ interval: Number.NaN, easeFactor: Number.NaN, repetitions: Number.NaN }, 4, reviewedAt);
  assert.equal(result.interval, 1);
  assert.equal(result.easeFactor, 2.5);
  assert.equal(result.repetitions, 1);
  assert.equal(Number.isNaN(result.dueDate.getTime()), false);
});
