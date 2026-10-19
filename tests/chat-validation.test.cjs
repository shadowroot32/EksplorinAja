'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chatMessageSchema } = require('../.test-build/chat-validation.js');

test('chat messages trim whitespace and accept valid content', () => {
  assert.deepEqual(chatMessageSchema.parse({ message: '  Help me study  ' }), { message: 'Help me study' });
});

test('chat messages reject empty or whitespace-only content', () => {
  assert.equal(chatMessageSchema.safeParse({ message: '' }).success, false);
  assert.equal(chatMessageSchema.safeParse({ message: '   ' }).success, false);
});

test('chat messages reject content beyond the per-request safety bound', () => {
  assert.equal(chatMessageSchema.safeParse({ message: 'a'.repeat(12_001) }).success, false);
  assert.equal(chatMessageSchema.safeParse({ message: 'a'.repeat(12_000) }).success, true);
});
