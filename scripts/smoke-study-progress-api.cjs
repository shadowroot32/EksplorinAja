'use strict';

const assert = require('node:assert/strict');
const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';

async function main() {
  const reviews = await fetch(baseUrl + '/api/reviews');
  assert.equal(reviews.status, 401, 'due review queue must require authentication');
  assert.deepEqual(await reviews.json(), { error: 'Unauthorized' });

  const postReview = await fetch(baseUrl + '/api/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cardId: 'not-owned', grade: 5 }),
  });
  assert.equal(postReview.status, 401, 'review submission must require authentication');
  assert.deepEqual(await postReview.json(), { error: 'Unauthorized' });

  const quiz = await fetch(baseUrl + '/api/study-sets/not-owned/quiz');
  assert.equal(quiz.status, 401, 'quiz questions must require authentication');

  console.log('Study progress API smoke tests passed: review GET/POST and quiz GET reject unauthenticated requests.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
