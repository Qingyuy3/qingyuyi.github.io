// Isolated in-memory D1/R2, never accesses production accounts or files.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { getPlatformProxy } from 'wrangler-platform';
const require = createRequire(import.meta.resolve('vite'));
const { build } = require('esbuild');
const built = await build({
  stdin: {
    contents:
      'export * from "./learning-platform/activity.ts";export * from "./learning-platform/todo-model.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { handleActivity, studentTodos } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(built.outputFiles[0].text).toString('base64')
);
const now = 1000000000,
  week = 7 * 86400000;
const tasks = [
  ['due', now + 1, 0],
  ['edge', now + week, 0],
  ['later', now + week + 1, 0],
  ['overdue', now - 1, 0],
  ['closed', now + 1, 1],
  ['none', null, 0],
  ['submitted', now + 1, 0],
].map(([id, deadline, closed]) => ({ id, deadline, closed }));
const todos = studentTodos(tasks, [{ assignment_id: 'submitted' }], now);
assert.deepEqual(
  todos.week.map((x) => x.id),
  ['due', 'edge'],
);
assert.deepEqual(
  todos.overdue.map((x) => x.id),
  ['overdue'],
);
assert.deepEqual(
  todos.later.map((x) => x.id),
  ['later', 'none'],
);
assert.deepEqual(
  todos.closed.map((x) => x.id),
  ['closed'],
);
const proxy = await getPlatformProxy({
  configPath: 'learning-platform/wrangler.material-test.jsonc',
  persist: false,
  remoteBindings: false,
  envFiles: [],
});
const env = proxy.env,
  teacher = { id: 'teacher', role: 'admin' },
  student = { id: 'student', role: 'user' },
  other = { id: 'other', role: 'user' };
async function call(path, method = 'GET', data, actor = student) {
  const req = new Request('https://local.test/api' + path, {
    method,
    ...(data === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
  });
  try {
    return await handleActivity(req, env, actor);
  } catch (e) {
    if (typeof e.status === 'number')
      return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
const notices = async (actor) =>
  await (await call('/notifications', 'GET', undefined, actor)).json();
try {
  for (const file of [
    '0001_auth.sql',
    '0002_learning.sql',
    '0003_counter_expiry.sql',
    '0004_material_management.sql',
    '0005_dashboard_notifications.sql',
  ]) {
    const sql = (
      await readFile('learning-platform/migrations/' + file, 'utf8')
    ).replace(/--[^\n]*/g, '');
    const parts = file.startsWith('0005')
      ? sql.split(/;\s*(?=CREATE|ALTER|$)/)
      : sql.split(';');
    await env.DB.batch(
      parts.filter((s) => s.trim()).map((s) => env.DB.prepare(s)),
    );
  }
  for (const [id, role, banned] of [
    ['teacher', 'admin', 0],
    ['student', 'user', 0],
    ['other', 'user', 0],
    ['disabled', 'user', 1],
  ])
    await env.DB.prepare(
      "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt,role,banned,mustChangePassword,temporaryExpires,className) VALUES(?,?,?,0,0,0,?,?,0,0,'一班')",
    )
      .bind(id, id, id + '@test.invalid', role, banned)
      .run();
  assert.equal(
    (
      await call('/admin/announcements', 'POST', {
        title: 'x',
        body: 'y',
        pinned: false,
      })
    ).status,
    403,
  );
  const result = await call(
    '/admin/announcements',
    'POST',
    { title: '课程安排', body: '请查看本周任务', pinned: true },
    teacher,
  );
  assert.equal(result.status, 201);
  const announcement = (await result.json()).id;
  let n = await notices(student);
  assert.equal(n.unread, 1);
  assert.equal((await notices(teacher)).unread, 0);
  assert.equal((await notices({ id: 'disabled', role: 'user' })).unread, 0);
  assert.equal(
    (await call('/notifications/read', 'POST', { id: n.items[0].id }, other))
      .status,
    404,
    'Cannot mark another user notification',
  );
  const boundary = n.latest;
  await call(
    '/admin/announcements',
    'POST',
    { title: '第二条', body: '新消息', pinned: false },
    teacher,
  );
  await call('/notifications/read', 'POST', { through: boundary });
  assert.equal(
    (await notices(student)).unread,
    1,
    'Read all must not clear newer arrivals',
  );
  await call(
    `/admin/announcements/${announcement}`,
    'PATCH',
    { hidden: true, pinned: true },
    teacher,
  );
  assert.ok(
    !(await notices(student)).items.some((x) => x.source_id === announcement),
  );
  assert.ok(
    !(await (await call('/announcements')).json()).items.some(
      (x) => x.id === announcement,
    ),
  );
  await call(
    `/admin/announcements/${announcement}`,
    'PATCH',
    { hidden: false, pinned: true },
    teacher,
  );
  assert.equal(
    (await notices(student)).items.length,
    2,
    'Restoring must not duplicate notices',
  );
  await env.DB.prepare(
    "INSERT INTO assignments VALUES('a','作业','要求',1,NULL,0,1)",
  ).run();
  await env.DB.prepare(
    "INSERT INTO uploads(id,owner_id,kind,assignment_id,title,module,filename,bytes,object_key,multipart_id,status,created_at,completed_at) VALUES('f','student','submission','a','实验报告',1,'a.txt',4,'f','none','ready',0,1)",
  ).run();
  await env.DB.prepare("UPDATE uploads SET grade=0 WHERE id='f'").run();
  n = await notices(student);
  assert.equal(n.items[0].kind, 'feedback');
  assert.equal(n.items[0].destination, 'work');
  assert.ok(!(await notices(other)).items.some((x) => x.kind === 'feedback'));
  const count = n.items.length;
  await env.DB.prepare("UPDATE uploads SET grade=0 WHERE id='f'").run();
  assert.equal(
    (await notices(student)).items.length,
    count,
    'Saving unchanged feedback must not notify twice',
  );
  await env.DB.prepare(
    "UPDATE uploads SET grade=NULL,feedback='' WHERE id='f'",
  ).run();
  assert.ok(!(await notices(student)).items.some((x) => x.kind === 'feedback'));
  await env.DB.prepare(
    "INSERT INTO posts VALUES('root','student',NULL,'问题',1,0)",
  ).run();
  await env.DB.prepare(
    "INSERT INTO posts VALUES('self','student','root','补充',2,0)",
  ).run();
  assert.ok(!(await notices(student)).items.some((x) => x.kind === 'reply'));
  await env.DB.prepare(
    "INSERT INTO posts VALUES('answer','teacher','root','回复',3,0)",
  ).run();
  n = await notices(student);
  assert.equal(n.items[0].kind, 'reply');
  assert.equal(n.items[0].target_id, 'root');
  await env.DB.prepare("UPDATE posts SET hidden=1 WHERE id='root'").run();
  assert.ok(!(await notices(student)).items.some((x) => x.kind === 'reply'));
  for (let i = 0; i < 35; i++)
    await env.DB.prepare(
      "INSERT INTO announcements VALUES(?, 'teacher','分页','正文',0,0,?)",
    )
      .bind('page' + i, i)
      .run();
  const first = await notices(student);
  assert.equal(first.items.length, 30);
  assert.ok(first.nextBefore);
  const second = await (
    await call('/notifications?before=' + first.nextBefore)
  ).json();
  assert.ok(second.items.every((x) => !first.items.some((y) => y.id === x.id)));
  const focus = (await (await call('/announcements?focusId=page0')).json())
    .items[0];
  assert.equal(focus.id, 'page0');
  const persisted = await notices(student);
  assert.equal(
    persisted.unread,
    first.unread,
    'Unread state persists across reads',
  );
  console.log(
    'PASS: migration and atomic notification triggers; teacher-only announcements; recipient isolation; hide/restore; zero grades; no self/duplicate alerts; read-all race; pagination; deep links; seven-day todo boundaries.',
  );
} finally {
  await proxy.dispose();
}
