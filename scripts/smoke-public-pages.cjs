'use strict';

const assert = require('node:assert/strict');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function readPage(path) {
  const response = await fetch(new URL(path, baseUrl), { redirect: 'manual' });
  assert.equal(response.status, 200, path + ' should return HTTP 200');
  return response.text();
}

async function main() {
  const [home, login, robots, sitemap, manifest] = await Promise.all([
    readPage('/'),
    readPage('/login'),
    readPage('/robots.txt'),
    readPage('/sitemap.xml'),
    readPage('/manifest.webmanifest'),
  ]);

  assert.match(home, /EksplorinAja/, 'landing page should use the new product name');
  assert.ok(home.includes('https://eksplorinaja.com'), 'public metadata should use the production canonical domain');
  assert.ok(robots.includes('https://eksplorinaja.com/sitemap.xml'), 'robots.txt should link to the canonical sitemap');
  assert.ok(robots.includes('Disallow: /api/'), 'robots.txt should disallow API routes');
  assert.ok(sitemap.includes('https://eksplorinaja.com/'), 'sitemap should use the canonical domain');
  assert.ok(!sitemap.includes('/dashboard') && !sitemap.includes('/api/'), 'sitemap must not include private or API paths');
  assert.doesNotMatch(home, /Cendekia\.ai|Explorin/i, 'landing page must not show the previous brand');
  assert.match(home, /Start learning for free|Mulai belajar gratis/i, 'landing page should render a primary CTA');
  assert.match(home, /English/, 'landing page should render the language control');
  assert.match(home, /theme/i, 'landing page should render the theme control');

  assert.match(login, /EksplorinAja/, 'login page should use the new product name');
  assert.doesNotMatch(login, /Cendekia\.ai|Explorin/i, 'login page must not show the previous brand');
  assert.match(login, /Continue with Google|Lanjutkan dengan Google/i, 'login page should render Google sign-in');
  assert.match(login, /Secure OAuth|OAuth 2\.0|Google/, 'login page should explain secure Google sign-in');
  assert.match(login, /English/, 'login page should render the language control');
  assert.match(login, /noindex/i, 'login page should not be indexed by search engines');
  assert.ok(!login.includes('<link rel="canonical"'), 'login page must not inherit the homepage canonical URL');
  assert.match(manifest, /EksplorinAja/, 'web app manifest should use the new product name');

  process.stdout.write('EksplorinAja landing and login pages passed branding and public-preference smoke tests.\n');
}

main().catch((error) => {
  process.stderr.write(String(error.stack || error) + '\n');
  process.exitCode = 1;
});
