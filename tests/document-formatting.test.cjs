'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildDocumentBlocks, normalizeOcrPageText } = require('../.test-build/document-formatting.js');

test('document formatter keeps OCR fragments out of the heading outline', () => {
  const blocks = buildDocumentBlocks([
    'Application Security',
    '',
    'Application security is a critical component of information security and protects applications from external threats.',
    '',
    'ETI TS TF = FF _ _',
    '',
    'sremEs iE it &',
    '',
    '1. Inspect the House for Weak Spots',
    'Use testing methods to identify and document software vulnerabilities.',
  ].join('\n'));

  const headings = blocks.filter((block) => block.type === 'heading').map((block) => block.text);
  assert.deepEqual(headings, ['Application Security', '1. Inspect the House for Weak Spots']);
  assert.ok(blocks.some((block) => block.type === 'paragraph' && block.text.includes('ETI TS TF = FF _ _')));
  assert.ok(blocks.some((block) => block.type === 'paragraph' && block.text.includes('sremEs iE it &')));
});

test('document formatter joins wrapped paragraph lines and keeps list items structured', () => {
  const blocks = buildDocumentBlocks([
    'A heading',
    '',
    'A paragraph that wrapped',
    'onto the next visual line and should remain a single readable paragraph.',
    '',
    '• Client devices request services.',
    '• Servers respond to clients.',
  ].join('\n'));

  assert.ok(blocks.some((block) => block.type === 'paragraph' && block.text === 'A paragraph that wrapped onto the next visual line and should remain a single readable paragraph.'));
  assert.deepEqual(blocks.filter((block) => block.type === 'listItem').map((block) => [block.marker, block.text]), [
    ['•', 'Client devices request services.'],
    ['•', 'Servers respond to clients.'],
  ]);
});


test('OCR normalization preserves paragraphs but removes inconsistent spacing and control characters', () => {
  assert.equal(
    normalizeOcrPageText('  Application Security  \r\n\r\n  is an important topic.  \u0000'),
    'Application Security\n\nis an important topic.',
  );
});
