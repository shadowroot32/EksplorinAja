'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getChatHistoryFilter } = require('../.test-build/chat-access.js');

test('chat history filter is scoped to both the requested study set and authenticated owner', () => {
  assert.deepEqual(getChatHistoryFilter('set-owned-by-alice', 'alice'), {
    studySetId: 'set-owned-by-alice', userId: 'alice',
  });
});

test('chat history filter retains the authenticated user rather than another owner', () => {
  const filter = getChatHistoryFilter('set-123', 'bob');
  assert.equal(filter.studySetId, 'set-123');
  assert.equal(filter.userId, 'bob');
  assert.notEqual(filter.userId, 'alice');
});
