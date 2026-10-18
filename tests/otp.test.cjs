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

const {
  createCodeChallenge,
  createCodeVerifier,
  createOpaqueToken,
  normalizeOAuthEmail,
  resolveGoogleRedirectUri,
  safeStringEqual,
} = require('../.test-build/google-oauth-utils.js');

test('OAuth state, nonce, and PKCE verifier use URL-safe cryptographic tokens', () => {
  assert.match(createOpaqueToken(), /^[A-Za-z0-9_-]{40,}$/);
  assert.match(createCodeVerifier(), /^[A-Za-z0-9_-]{40,}$/);
});

test('PKCE S256 challenge is deterministic and URL-safe', () => {
  const challenge = createCodeChallenge('test-verifier');
  assert.equal(challenge, createCodeChallenge('test-verifier'));
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(challenge, createCodeChallenge('another-verifier'));
});

test('OAuth state comparison rejects different strings', () => {
  assert.equal(safeStringEqual('state-abc', 'state-abc'), true);
  assert.equal(safeStringEqual('state-abc', 'state-abd'), false);
  assert.equal(safeStringEqual('state', 'longer-state'), false);
});

test('Google email normalization trims and lowercases addresses', () => {
  assert.equal(normalizeOAuthEmail(' Student@Example.COM '), 'student@example.com');
});

test('redirect URI defaults to local development origin only outside production', () => {
  assert.equal(
    resolveGoogleRedirectUri('http://localhost:3000', { NODE_ENV: 'development' }),
    'http://localhost:3000/api/auth/google/callback',
  );
  assert.equal(
    resolveGoogleRedirectUri('https://example.com', { NODE_ENV: 'production' }),
    null,
  );
});

test('redirect URI accepts HTTPS configured callback and rejects non-HTTPS production', () => {
  assert.equal(
    resolveGoogleRedirectUri('https://unused.example', {
      NODE_ENV: 'production',
      GOOGLE_REDIRECT_URI: 'https://learn.example.com/api/auth/google/callback',
    }),
    'https://learn.example.com/api/auth/google/callback',
  );
  assert.equal(
    resolveGoogleRedirectUri('https://unused.example', {
      NODE_ENV: 'production',
      GOOGLE_REDIRECT_URI: 'http://learn.example.com/api/auth/google/callback',
    }),
    null,
  );
});

test('redirect URI rejects a callback path outside the Google OAuth callback route', () => {
  assert.equal(
    resolveGoogleRedirectUri('http://localhost:3000', {
      NODE_ENV: 'development',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/dashboard',
    }),
    null,
  );
});
