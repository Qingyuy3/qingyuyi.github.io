// Local operator recovery only. Requires an explicit request to reset teacher.
// Never deploy this script, expose an unauthenticated reset endpoint, or log secrets.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hashPassword } from 'better-auth/crypto';

assert.equal(process.argv[2], '--confirm-teacher-reset', 'Explicit teacher reset confirmation required');
const root = resolve('learning-platform');
const cli = resolve('node_modules/wrangler-platform/bin/wrangler.js');
const exec = promisify(execFile);
async function query(args) {
  try {
    const { stdout } = await exec(process.execPath, ['--dns-result-order=ipv4first', cli, 'd1', 'execute', 'xjtu-learning-pilot', '--remote', '--config', 'wrangler.jsonc', '--json', ...args], { cwd: root, timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
    // Remote file import may print progress before its JSON result.
    const payload = stdout.match(/\[\s*\{\s*"results"[\s\S]*\]\s*$/)?.[0] ?? stdout;
    const result = JSON.parse(payload);
    assert.ok(result.every(r => r.success));
    return result;
  } catch {
    throw new Error('Cloudflare operation did not confirm success. Inspect account state before retrying; no credentials logged.');
  }
}
const email = 'teacher@students.invalid';
const rows = (await query(['--command', `SELECT u.id,u.role,u.banned,a.id AS account_id,a.providerId FROM user u JOIN account a ON a.userId=u.id WHERE u.email='${email}'`]))[0].results;
assert.equal(rows.length, 1, 'Expected exactly one teacher credential account');
const teacher = rows[0];
assert.equal(teacher.role, 'admin');
assert.ok(!teacher.banned, 'Do not reactivate disabled accounts');
assert.equal(teacher.providerId, 'credential');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const password = randomBytes(18).toString('base64url');
const hashed = await hashPassword(password);
const now = Date.now();
const note = `网址：https://xjtu-learning-pilot.pages.dev/\n教师账号：teacher\n临时密码：${password}\n重置时间：${new Date(now).toISOString()}\n7 天内有效。首次登录后，在“当前密码”再次填写此临时密码，再设置至少 12 位的新密码。\n改密成功后，临时密码立即失效；请改用您设置的新密码登录。\n请勿上传 GitHub 或发送到群聊。\n`;
await mkdir(resolve(root, 'private'), { recursive: true });
const recovery = resolve(root, `private/teacher-reset-${now}.txt`);
await writeFile(recovery, note, { flag: 'wx', mode: 0o600 });
const sqlPath = resolve(root, `private/teacher-reset-${now}.sql`);
// Fail closed during recovery: require activation and revoke sessions before updating the hash.
const sql = `
UPDATE user SET mustChangePassword=1,temporaryExpires=${now + 7 * 86400000},updatedAt=${quote(new Date(now).toISOString())} WHERE id=${quote(teacher.id)} AND email=${quote(email)} AND role='admin';
DELETE FROM session WHERE userId=${quote(teacher.id)};
UPDATE account SET password=${quote(hashed)},updatedAt=${quote(new Date(now).toISOString())} WHERE id=${quote(teacher.account_id)} AND userId=${quote(teacher.id)} AND providerId='credential';
DELETE FROM counters WHERE key=${quote('login-account:' + email)} OR key=${quote('password:' + teacher.id)};
INSERT INTO audit(id,actor_id,action,target_id,created_at) VALUES(${quote(randomUUID())},'local-operator','teacher-password-recovery',${quote(teacher.id)},${now});
`;
await writeFile(sqlPath, sql, { flag: 'wx', mode: 0o600 });
await query(['--file', sqlPath]);
await unlink(sqlPath);
await writeFile(resolve(root, 'private/教师首次登录.txt'), note, { mode: 0o600 });

const base = 'https://xjtu-learning-pilot.pages.dev';
const login = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'teacher', password }), signal: AbortSignal.timeout(20000) });
assert.equal(login.status, 200, 'Reset saved, but live login verification failed');
const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
try {
  const response = await fetch(base + '/api/me', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) });
  const { user } = await response.json();
  assert.equal(user?.role, 'teacher');
  assert.equal(user?.mustChangePassword, true);
} finally {
  const logout = await fetch(base + '/api/logout', { method: 'POST', headers: { Origin: base, Cookie: cookie }, signal: AbortSignal.timeout(20000) });
  assert.ok(logout.ok, 'Verification session logout failed');
}
console.log('Teacher password reset verified: login 200, first-use password change required, verification session logged out. Credentials saved privately.');
