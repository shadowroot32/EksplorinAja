'use strict';

const assert = require('node:assert/strict');
const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';

async function main() {
  const checks = [
    ['/api/study-sets/example/cornell', 'GET'],
    ['/api/study-sets/example/podcast', 'GET'],
    ['/api/study-sets/example/mind-map', 'POST'],
    ['/api/study-sets/example/share', 'POST'],
    ['/api/study-sets/example/edit', 'POST'],
    ['/api/user/export', 'GET'],
  ];

  for (const [path, method] of checks) {
    const response = await fetch(baseUrl + path, {
      method,
      ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: '{}' } : {}),
    });
    assert.equal(response.status, 401, method + ' ' + path + ' must require authentication');
  }

  const invalidShare = await fetch(baseUrl + '/api/share/invalid-token');
  assert.equal(invalidShare.status, 404, 'invalid public share tokens must not disclose documents');

  console.log('Learning API smoke tests passed: private routes (including data export) require auth and invalid share tokens return 404.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
