const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateOtp, hashOtp, normalizeEmail } = require('../.test-build/otp.js');

test('generateOtp always returns a six-digit numeric code', () => {
  for (let i = 0; i < 500; i += 1) {
    const code = generateOtp();
    assert.match(code, /^\d{6}$/);
    assert.ok(Number(code) >= 100000 && Number(code) <= 999999);
  }
});

test('normalizeEmail trims whitespace and lowercases the address', () => {
  assert.equal(normalizeEmail('  Student.Example@GMAIL.COM  '), 'student.example@gmail.com');
});

test('OTP hashes are deterministic SHA-256 HMAC hex strings', () => {
  const hash = hashOtp('482913', 'a-test-secret-with-enough-entropy');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, hashOtp('482913', 'a-test-secret-with-enough-entropy'));
});

test('OTP hashes differ when either the code or secret changes', () => {
  const expected = hashOtp('482913', 'secret-one');
  assert.notEqual(expected, hashOtp('482914', 'secret-one'));
  assert.notEqual(expected, hashOtp('482913', 'secret-two'));
});

test('hashOtp rejects an empty secret', () => {
  assert.throws(() => hashOtp('482913', ''), /non-empty secret/);
});
