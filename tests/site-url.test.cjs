'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getSiteUrl } = require('../.test-build/site-url.js');

test('production canonical URL defaults to eksplorinaja.com', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NODE_ENV = 'production';
  delete process.env.NEXT_PUBLIC_APP_URL;

  try {
    assert.equal(getSiteUrl().toString(), 'https://eksplorinaja.com/');
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = oldAppUrl;
  }
});

test('configured site URL is normalized to the origin', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_APP_URL = 'https://eksplorinaja.com/some/path';

  try {
    assert.equal(getSiteUrl().toString(), 'https://eksplorinaja.com/');
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = oldAppUrl;
  }
});

test('production rejects insecure HTTP app URL and uses canonical fallback', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_APP_URL = 'http://preview.example.com';

  try {
    assert.equal(getSiteUrl().toString(), 'https://eksplorinaja.com/');
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = oldAppUrl;
  }
});
