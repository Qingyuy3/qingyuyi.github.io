// Resume verification after an uncertain CLI response; does not reset again.
import assert from 'node:assert/strict';
import { readFile, copyFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
const filename = process.argv[2];
assert.match(filename ?? '', /^teacher-reset-\d+\.txt$/);
const source = resolve('learning-platform/private', filename);
const note = await readFile(source, 'utf8');
const password = note.match(/临时密码：([^\r\n]+)/)?.[1];
assert.ok(password);
const base = 'https://xjtu-learning-pilot.pages.dev';
const response = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'teacher', password }), signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200, 'Live verification failed; credential file not replaced');
const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
try {
  const { user } = await (await fetch(base + '/api/me', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) })).json();
  assert.equal(user?.role, 'teacher');
  assert.equal(user?.mustChangePassword, true);
  await copyFile(source, resolve('learning-platform/private/教师首次登录.txt'));
  await unlink(source.replace(/\.txt$/, '.sql'));
} finally {
  const logout = await fetch(base + '/api/logout', { method: 'POST', headers: { Origin: base, Cookie: cookie }, signal: AbortSignal.timeout(20000) });
  assert.ok(logout.ok);
}
console.log('PASS: teacher login 200, password activation required, handover file updated, diagnostic session logged out.');
