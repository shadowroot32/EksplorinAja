const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function dictionaryKeys(source, name, nextName) {
  const start = source.indexOf(`const ${name}: Record<string, string> = {`);
  assert.notEqual(start, -1, `dictionary ${name} should exist`);
  const end = source.indexOf(`const ${nextName}:`, start);
  assert.notEqual(end, -1, `dictionary ${nextName} should follow ${name}`);
  return [...source.slice(start, end).matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]);
}

test('English and Indonesian dictionaries contain the same translation keys', () => {
  const source = read('src/components/providers/PreferencesProvider.tsx');
  const english = dictionaryKeys(source, 'en', 'id');
  const indonesian = dictionaryKeys(source, 'id', 'dictionaries');
  assert.ok(english.length > 250, 'translation coverage should remain broad');
  assert.deepEqual(indonesian.filter((key) => !english.includes(key)), [], 'Indonesian must not introduce unknown keys');
  assert.deepEqual(english.filter((key) => !indonesian.includes(key)), [], 'every English label must have an Indonesian translation');
  assert.equal(new Set(english).size, english.length, 'English keys should not be duplicated');
  assert.equal(new Set(indonesian).size, indonesian.length, 'Indonesian keys should not be duplicated');
});

test('dashboard workspace shortcuts only target supported workspace tabs', () => {
  const dashboard = read('src/app/(dashboard)/dashboard/page.tsx');
  const workspace = read('src/app/(dashboard)/study/[setId]/StudyClient.tsx');
  for (const tab of ['document', 'summaries', 'notes', 'flashcards', 'mindmap', 'artifacts']) {
    assert.ok(dashboard.includes(`key: '${tab}'`), `dashboard shortcut for ${tab} should exist`);
    assert.ok(workspace.includes(`'${tab}'`), `workspace should support ${tab}`);
  }
  assert.ok(dashboard.includes("'?tab=' + shortcut.key"), 'dashboard shortcut should pass the selected tab');
  assert.ok(workspace.includes("new URLSearchParams(window.location.search).get('tab')"), 'workspace should read the selected tab');
});

test('Next.js proxy guards authenticated learning routes and fails closed in production', () => {
  const proxy = read('src/proxy.ts');
  assert.match(proxy, /export async function proxy\(/);
  assert.match(proxy, /process\.env\.NODE_ENV === 'production'/);
  assert.match(proxy, /JWT_SECRET/);
  assert.match(proxy, /jwtVerify\(token, secret\(\)\)/);
  for (const route of ['/dashboard/:path*', '/review/:path*', '/subjects/:path*', '/library/:path*', '/study/:path*', '/settings/:path*']) {
    assert.ok(proxy.includes(route), `proxy matcher should include ${route}`);
  }
});
