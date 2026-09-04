// Generates private test/bootstrap artifacts, never prints credentials.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { authOptions } from './auth-options.ts';
import { assignmentTasks } from '../data/course.ts';

await mkdir('learning-platform/private', { recursive: true });
try {
  await access('learning-platform/private/bootstrap.sql');
  throw new Error('Bootstrap already exists; refusing to regenerate accounts.');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
const database = new DatabaseSync(':memory:');
const auth = betterAuth({
  ...authOptions,
  database,
  secret: randomBytes(32).toString('hex'),
});
await (await getMigrations(auth.options)).runMigrations();
const password = randomBytes(18).toString('base64url');
await auth.api.createUser({
  body: {
    name: '课程教师',
    email: 'teacher@students.invalid',
    password,
    role: 'admin',
    data: {
      mustChangePassword: true,
      temporaryExpires: Date.now() + 7 * 86400000,
      className: '',
    },
  },
});
const sqlValue = (v) =>
  v === null
    ? 'NULL'
    : typeof v === 'number'
      ? String(v)
      : `'${String(v).replaceAll("'", "''")}'`;
let sql = '-- Private bootstrap. Apply once to an empty platform database.\n';
for (const table of ['user', 'account']) {
  const rows = database.prepare(`SELECT * FROM "${table}"`).all();
  for (const row of rows)
    sql += `INSERT INTO "${table}" (${Object.keys(row)
      .map((k) => `"${k}"`)
      .join(',')}) VALUES(${Object.values(row).map(sqlValue).join(',')});\n`;
}
for (const task of assignmentTasks)
  sql += `INSERT INTO assignments(id,title,description,module,deadline,closed,created_at) VALUES(${[task.id, task.title, task.description, task.module, null, 0, Date.now()].map(sqlValue).join(',')});\n`;
await writeFile('learning-platform/private/bootstrap.sql', sql, { flag: 'wx' });
await writeFile(
  'learning-platform/private/教师首次登录.txt',
  `教师账号：teacher\n临时密码：${password}\n首次登录必须修改密码。请勿将本文件上传 GitHub 或发到班级群。\n`,
  { flag: 'wx' },
);
const secret = randomBytes(32).toString('hex');
await writeFile(
  'learning-platform/private/secrets.json',
  JSON.stringify({ AUTH_SECRET: secret }),
  { flag: 'wx' },
);
await writeFile(
  'learning-platform/.dev.vars',
  `AUTH_SECRET=${secret}\nPUBLIC_ORIGIN=http://localhost:8790\n`,
  { flag: 'wx' },
);
database.close();
console.log(
  'Private bootstrap and local configuration generated (credentials not printed).',
);
