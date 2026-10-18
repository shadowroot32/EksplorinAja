'use strict';

const assert = require('node:assert/strict');

const baseUrl = 'http://127.0.0.1:3000';

async function post(path, body) {
  const response = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function main() {
  const landing = await fetch(baseUrl + '/');
  assert.equal(landing.status, 200, 'production landing page should respond with HTTP 200');

  const invalidEmail = await post('/api/auth/send-otp', { email: 'not-an-email' });
  assert.equal(invalidEmail.status, 400, 'send-otp should reject invalid email before touching SMTP or the database');
  assert.match(invalidEmail.body.error, /valid email/i);

  // CI intentionally has no SMTP credentials. A valid OTP request must fail honestly,
  // without generating/storing an OTP and without reporting success.
  const missingSmtp = await post('/api/auth/send-otp', { email: 'otp-smoke@example.com' });
  assert.equal(missingSmtp.status, 503, 'send-otp must report missing SMTP configuration');
  assert.match(missingSmtp.body.error, /SMTP/i);
  assert.notEqual(missingSmtp.body.success, true);

  const invalidCode = await post('/api/auth/verify-otp', {
    email: 'otp-smoke@example.com',
    code: '123',
  });
  assert.equal(invalidCode.status, 400, 'verify-otp should reject non-six-digit codes before database access');

  console.log('OTP API smoke tests passed: landing page 200, invalid email 400, missing SMTP 503, malformed code 400.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
