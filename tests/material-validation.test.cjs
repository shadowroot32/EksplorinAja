'use strict';

const { test } = require('node:test');
const { buildDocumentBlocks, normalizeOcrPageText } = require('../.test-build/document-formatting.js');
const assert = require('node:assert/strict');
const {
  AI_REQUEST_TIMEOUT_MS,
  MAX_PDF_BYTES,
  MAX_SOURCE_CHARS,
  MAX_PDF_OCR_PAGES,
  MIN_NATIVE_PDF_TEXT_CHARS,
  PDF_OCR_TIMEOUT_MS,
  shouldRunPdfOcr,
  getPdfUploadError,
  getYouTubeVideoId,
  hasPdfSignature,
  parseFlashcardsOutput,
  parseQuizOutput,
  parseSummaryOutput,
  textStudySetSchema,
  youtubeStudySetSchema,
} = require('../.test-build/ai/material-validation.js');

test('source and timeout limits stay bounded for a single serverless request', () => {
  assert.equal(MAX_PDF_BYTES, 4 * 1024 * 1024);
  assert.equal(MAX_SOURCE_CHARS, 60_000);
  assert.ok(AI_REQUEST_TIMEOUT_MS > 0 && AI_REQUEST_TIMEOUT_MS <= 15_000);
  assert.equal(MIN_NATIVE_PDF_TEXT_CHARS, 40);
  assert.equal(MAX_PDF_OCR_PAGES, 8);
  assert.ok(PDF_OCR_TIMEOUT_MS > 0 && PDF_OCR_TIMEOUT_MS <= 30_000);
});

test('PDF validation rejects wrong extensions, types, empty files, and oversized files', () => {
  assert.equal(getPdfUploadError({ name: 'notes.txt', size: 100, type: 'text/plain' }), 'invalid_extension');
  assert.equal(getPdfUploadError({ name: 'notes.pdf', size: 100, type: 'text/plain' }), 'invalid_type');
  assert.equal(getPdfUploadError({ name: 'notes.pdf', size: 0, type: 'application/pdf' }), 'empty_file');
  assert.equal(getPdfUploadError({ name: 'notes.pdf', size: MAX_PDF_BYTES + 1, type: 'application/pdf' }), 'file_too_large');
  assert.equal(getPdfUploadError({ name: 'notes.pdf', size: 100, type: 'application/pdf' }), null);
});

test('PDF OCR fallback only activates when native text extraction returns too little text', () => {
  assert.equal(shouldRunPdfOcr(''), true);
  assert.equal(shouldRunPdfOcr('  \\n  '), true);
  assert.equal(shouldRunPdfOcr('A'.repeat(MIN_NATIVE_PDF_TEXT_CHARS - 1)), true);
  assert.equal(shouldRunPdfOcr('A'.repeat(MIN_NATIVE_PDF_TEXT_CHARS)), false);
  assert.equal(shouldRunPdfOcr('A useful page of extracted PDF text with headings and complete sentences.'), false);
});

test('PDF signature checks actual bytes rather than trusting filename or MIME type', () => {
  assert.equal(hasPdfSignature(Buffer.from('%PDF-1.7 test')), true);
  assert.equal(hasPdfSignature(Buffer.from('not a PDF')), false);
  assert.equal(hasPdfSignature(Buffer.from('%PDF')), false);
});

test('YouTube IDs are extracted only from supported YouTube hosts and paths', () => {
  assert.equal(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(getYouTubeVideoId('https://evil.example/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(getYouTubeVideoId('https://youtube.com/watch?v=bad'), null);
});

test('text and YouTube source schemas reject oversized text and unsupported URLs', () => {
  assert.equal(textStudySetSchema.safeParse({
    title: 'Materi',
    sourceType: 'text',
    content: 'A'.repeat(MAX_SOURCE_CHARS + 1),
  }).success, false);
  assert.equal(textStudySetSchema.safeParse({
    title: 'Materi',
    sourceType: 'text',
    content: 'Isi materi yang cukup panjang.',
  }).success, true);
  assert.equal(youtubeStudySetSchema.safeParse({
    title: 'Materi',
    sourceType: 'youtube',
    url: 'https://evil.example/watch?v=dQw4w9WgXcQ',
  }).success, false);
});

test('flashcard parser accepts clean JSON and a fenced response, but trims and validates fields', () => {
  assert.deepEqual(parseFlashcardsOutput('[{"front":" Q ","back":" A "}]'), [{ front: 'Q', back: 'A' }]);
  assert.deepEqual(parseFlashcardsOutput('\`\`\`json\\n[{"front":"Q","back":"A"}]\\n\`\`\`'), [{ front: 'Q', back: 'A' }]);
  assert.throws(() => parseFlashcardsOutput('[{"front":"","back":"A"}]'), /schema validation/);
  assert.throws(() => parseFlashcardsOutput('not json'), /JSON array/);
});

test('quiz parser requires four answer options and a valid correct index', () => {
  const valid = [{ question: 'Apa?', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'Karena benar.' }];
  assert.deepEqual(parseQuizOutput(JSON.stringify(valid)), valid);
  assert.throws(() => parseQuizOutput(JSON.stringify([{ ...valid[0], options: ['A', 'B'] }])), /schema validation/);
  assert.throws(() => parseQuizOutput(JSON.stringify([{ ...valid[0], correctIndex: 4 }])), /schema validation/);
});

test('summary parser rejects blank, overly short, and oversized content', () => {
  assert.equal(parseSummaryOutput('Ini adalah ringkasan yang menjelaskan materi dengan cukup jelas dan benar.').startsWith('Ini'), true);
  assert.throws(() => parseSummaryOutput('singkat'), /schema validation/);
  assert.throws(() => parseSummaryOutput('A'.repeat(30_001)), /schema validation/);
});


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
