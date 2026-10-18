'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createShareToken,
  hashShareToken,
  isValidShareToken,
  parseMindMapOutput,
} = require('../.test-build/feature-utils.js');

test('share links use high-entropy URL-safe tokens and only hashes are suitable for storage', () => {
  const token = createShareToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(isValidShareToken(token), true);
  assert.equal(isValidShareToken('short'), false);
  assert.equal(hashShareToken(token), hashShareToken(token));
  assert.match(hashShareToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashShareToken(token), token);
});

test('mind map parser accepts a single valid root and linked descendants', () => {
  const parsed = parseMindMapOutput(JSON.stringify({
    title: 'Sistem tata surya',
    nodes: [
      { id: 'root', label: 'Sistem tata surya', parentId: null },
      { id: 'planets', label: 'Planet', parentId: 'root' },
      { id: 'earth', label: 'Bumi', parentId: 'planets' },
    ],
  }));
  assert.equal(parsed.nodes.length, 3);
  assert.equal(parsed.nodes[2].parentId, 'planets');
});

test('mind map parser rejects duplicate ids, missing parents, multiple roots, and cycles', () => {
  const base = { title: 'Map', nodes: [
    { id: 'root', label: 'Root', parentId: null },
    { id: 'a', label: 'A', parentId: 'root' },
    { id: 'b', label: 'B', parentId: 'root' },
  ] };
  assert.throws(() => parseMindMapOutput(JSON.stringify({ ...base, nodes: [...base.nodes, { id: 'a', label: 'Duplicate', parentId: 'root' }] })), /unique/);
  assert.throws(() => parseMindMapOutput(JSON.stringify({ ...base, nodes: base.nodes.map((n) => n.id === 'a' ? { ...n, parentId: 'missing' } : n) })), /parent reference|orphan/);
  assert.throws(() => parseMindMapOutput(JSON.stringify({ ...base, nodes: base.nodes.map((n) => n.id === 'a' ? { ...n, parentId: null } : n) })), /one root/);
  assert.throws(() => parseMindMapOutput(JSON.stringify({ title: 'Cycle', nodes: [
    { id: 'root', label: 'Root', parentId: null },
    { id: 'a', label: 'A', parentId: 'b' },
    { id: 'b', label: 'B', parentId: 'a' },
  ] })), /cycle/);
});
