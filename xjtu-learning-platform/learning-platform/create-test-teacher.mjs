// Explicitly authorized local-operator provisioning of one additional teacher.
// Inserts only this new account; never resets or modifies an existing account.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { authOptions } from './auth-options.ts';

assert.equal(process.argv[2], '--confirm-create-teacher-test');
const username = 'teacher_test', email = username + '@students.invalid';
const root = resolve('learning-platform');
const cli = resolve('node_modules/wrangler-platform/bin/wrangler.js');
const exec = promisify(execFile);
async function query(args) {
  try {
    const { stdout } = await exec(process.execPath, ['--dns-result-order=ipv4first', cli, 'd1', 'execute', 'xjtu-learning-pilot', '--remote', '--config', 'wrangler.jsonc', '--json', ...args], { cwd: root, timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
    const result = JSON.parse(stdout.match(/\[\s*\{\s*"results"[\s\S]*\]\s*$/)?.[0] ?? stdout);
    assert.ok(result.every(r => r.success));
    return result;
  } catch {
    throw new Error('Cloudflare outcome not confirmed. Check account state before retrying; no credentials logged.');
  }
}
const existing = await query(['--command', `SELECT id FROM user WHERE email='${email}'; SELECT COUNT(*) AS n FROM user;`]);
assert.equal(existing[0].results.length, 0, 'Account exists; will not overwrite');
assert.ok(existing[1].results[0].n < 80, 'Platform account limit reached');
const database = new DatabaseSync(':memory:');
const auth = betterAuth({ ...authOptions, database, secret: randomBytes(32).toString('hex') });
await (await getMigrations(auth.options)).runMigrations();
const password = randomBytes(18).toString('base64url');
const expires = Date.now() + 7 * 86400000;
const created = await auth.api.createUser({ body: {
  name: '试用教师', email, password, role: 'admin',
  data: { mustChangePassword: true, temporaryExpires: expires, className: '' },
} });
const literal = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
let sql = '';
for (const table of ['user', 'account']) {
  const rows = database.prepare(`SELECT * FROM "${table}"`).all();
  assert.equal(rows.length, 1);
  for (const row of rows) sql += `INSERT INTO "${table}" (${Object.keys(row).map(k => `"${k}"`).join(',')}) VALUES(${Object.values(row).map(literal).join(',')});\n`;
}
sql += `INSERT INTO audit(id,actor_id,action,target_id,created_at) VALUES(${literal(randomUUID())},'local-operator','create-test-teacher',${literal(created.user.id)},${Date.now()});\n`;
database.close();
await mkdir(resolve(root, 'private'), { recursive: true });
const sqlPath = resolve(root, 'private/create-teacher-test.sql');
await writeFile(resolve(root, 'private/试用教师登录.txt'),
  `网址：https://xjtu-learning-pilot.pages.dev/\n账号：${username}\n临时密码：${password}\n临时密码有效至：${new Date(expires).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}（北京时间）\n首次登录须设置至少 12 位的新密码；“当前密码”填写上述临时密码。请保存好新密码，之后使用新密码登录。\n权限：完整教师管理员权限。此账号操作的是正式课程平台，不是隔离的测试环境。\n请单独交给试用教师，不要发到班级群或上传 GitHub。\n`, { flag: 'wx', mode: 0o600 });
await writeFile(sqlPath, sql, { flag: 'wx', mode: 0o600 });
await query(['--file', sqlPath]);
await unlink(sqlPath);
const base = 'https://xjtu-learning-pilot.pages.dev';
const response = await fetch(base + '/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200, 'Created but login verification failed');
const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
try {
  const { user } = await (await fetch(base + '/api/me', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) })).json();
  assert.equal(user.username, username);
  assert.equal(user.role, 'teacher');
  assert.equal(user.mustChangePassword, true);
  const gate = await fetch(base + '/api/admin/users', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) });
  assert.equal(gate.status, 403, 'Activation required before teacher access');
} finally {
  const logout = await fetch(base + '/api/logout', { method: 'POST', headers: { Origin: base, Cookie: cookie }, signal: AbortSignal.timeout(20000) });
  assert.ok(logout.ok);
}
console.log('PASS: teacher_test created, login verified, teacher role confirmed, first-use password change required; existing accounts unchanged. Credentials saved privately.');
