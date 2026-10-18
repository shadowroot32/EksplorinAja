'use strict';

const assert = require('node:assert/strict');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';

async function main() {
  const getResponse = await fetch(baseUrl + '/api/study-sets');
  assert.equal(getResponse.status, 401, 'study-set listing must require authentication');
  assert.deepEqual(await getResponse.json(), { error: 'Unauthorized' });

  const postResponse = await fetch(baseUrl + '/api/study-sets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Should not create data',
      sourceType: 'text',
      content: 'This request is not authenticated.',
    }),
  });
  assert.equal(postResponse.status, 401, 'study-set creation must require authentication before parsing/generation');
  assert.deepEqual(await postResponse.json(), { error: 'Unauthorized' });

  console.log('Material API smoke tests passed: GET and POST study-sets both require authentication.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
