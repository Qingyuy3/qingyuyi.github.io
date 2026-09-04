// Real local D1/R2 bindings, isolated in memory. Never connects to course data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { getPlatformProxy } from 'wrangler-platform';
const require = createRequire(import.meta.resolve('vite'));
const { build } = require('esbuild');
const result = await build({
  stdin: {
    contents:
      'export { handleMaterialAdmin } from "./learning-platform/materials.ts"; export { handleUploads } from "./learning-platform/uploads.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { handleMaterialAdmin, handleUploads } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(result.outputFiles[0].text).toString('base64')
);
const proxy = await getPlatformProxy({
  configPath: 'learning-platform/wrangler.material-test.jsonc',
  persist: false,
  remoteBindings: false,
  envFiles: [],
});
const env = proxy.env;
const teacher = { id: 't', role: 'admin' },
  student = { id: 's', role: 'user' },
  otherTeacher = { id: 't2', role: 'admin' };
async function call(
  path,
  method = 'GET',
  data,
  actor = teacher,
  bindings = env,
) {
  const request = new Request('https://local.test/api' + path, {
    method,
    ...(data
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      : {}),
  });
  try {
    return await (
      path.startsWith('/admin/materials') ? handleMaterialAdmin : handleUploads
    )(request, bindings, actor);
  } catch (e) {
    if (typeof e.status === 'number')
      return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
async function state(id = 'm1') {
  return env.DB.prepare('SELECT * FROM uploads WHERE id=?').bind(id).first();
}
async function change(
  action,
  id = 'm1',
  extra = {},
  actor = teacher,
  bindings = env,
) {
  const current = await state(id);
  return call(
    `/admin/materials/${id}${action ? '/' + action : ''}`,
    action ? 'POST' : 'PATCH',
    { version: current.material_version, ...extra },
    actor,
    bindings,
  );
}
try {
  for (const file of [
    '0001_auth.sql',
    '0002_learning.sql',
    '0003_counter_expiry.sql',
  ]) {
    const sql = await readFile('learning-platform/migrations/' + file, 'utf8');
    await env.DB.batch(
      sql
        .replace(/--[^\n]*/g, '')
        .split(';')
        .filter((s) => s.trim())
        .map((s) => env.DB.prepare(s)),
    );
  }
  for (const user of [teacher, student, otherTeacher])
    await env.DB.prepare(
      `INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt,role,banned,mustChangePassword,temporaryExpires,className) VALUES(?,?,?,0,0,0,?,0,0,0,'')`,
    )
      .bind(user.id, user.id, user.id + '@test.invalid', user.role)
      .run();
  await env.DB.prepare(
    "INSERT INTO uploads(id,owner_id,kind,title,module,filename,bytes,object_key,multipart_id,status,created_at,completed_at) VALUES('m1','t','material','测试资料',1,'测试.txt',4,'test/m1','unused','ready',0,1)",
  ).run();
  await env.FILES.put('test/m1', 'data');
  const sql = await readFile(
    'learning-platform/migrations/0004_material_management.sql',
    'utf8',
  );
  await env.DB.batch(
    sql
      .replace(/--[^\n]*/g, '')
      .split(';')
      .filter((s) => s.trim())
      .map((s) => env.DB.prepare(s)),
  );
  assert.equal(
    (await state()).visibility,
    'published',
    'Existing files stay published',
  );
  assert.equal(
    (await call('/admin/materials', 'GET', undefined, student)).status,
    403,
  );
  assert.equal(
    (await call('/materials', 'GET', undefined, student)).status,
    200,
  );
  assert.equal(
    (await (await call('/materials', 'GET', undefined, student)).json()).files
      .length,
    1,
  );
  assert.equal(
    await (await call('/files/m1', 'GET', undefined, student)).text(),
    'data',
  );
  assert.equal((await change('hide', 'm1', {}, student)).status, 403);
  assert.equal((await change('hide')).status, 200);
  assert.equal(
    (await call('/files/m1', 'GET', undefined, student)).status,
    404,
  );
  assert.equal(
    (await (await call('/materials', 'GET', undefined, student)).json()).files
      .length,
    0,
  );
  assert.equal(
    (await call('/files/m1')).status,
    200,
    'Teacher may inspect hidden file',
  );
  assert.equal(
    (await call('/admin/materials/m1/publish', 'POST', { version: 0 })).status,
    409,
    'Stale edit rejected',
  );
  assert.equal(
    (
      await change(
        undefined,
        'm1',
        { title: '新标题', module: 5 },
        otherTeacher,
      )
    ).status,
    200,
  );
  assert.equal((await state()).module, 5);
  assert.equal(
    (await state()).object_key,
    'test/m1',
    'Editing unit does not relocate bytes',
  );
  assert.equal(
    (await change(undefined, 'm1', { title: '', module: 5 })).status,
    400,
  );
  assert.equal((await change('publish')).status, 200);
  assert.equal(
    (await call('/files/m1', 'GET', undefined, student)).status,
    200,
  );
  assert.equal(
    (await change('purge', 'm1', { confirmFilename: '测试.txt' })).status,
    409,
  );
  assert.equal((await change('trash')).status, 200);
  assert.equal((await call('/files/m1')).status, 404);
  assert.ok(await env.FILES.head('test/m1'), 'Trash retains bytes');
  assert.equal((await change('restore')).status, 200);
  assert.equal((await state()).visibility, 'hidden');
  assert.equal(
    (await call('/files/m1', 'GET', undefined, student)).status,
    404,
  );
  // Concurrent edits to the same version cannot both succeed.
  const version = (await state()).material_version;
  const competing = await Promise.all(
    ['publish', 'trash'].map((action) =>
      call('/admin/materials/m1/' + action, 'POST', { version }),
    ),
  );
  assert.deepEqual(competing.map((r) => r.status).sort(), [200, 409]);
  if ((await state()).visibility !== 'trashed')
    assert.equal((await change('trash')).status, 200);
  assert.equal(
    (await change('purge', 'm1', { confirmFilename: 'wrong.txt' })).status,
    400,
  );
  // Fault injection: storage failure leaves a non-downloadable, non-restorable tombstone.
  await assert.rejects(
    () =>
      change('purge', 'm1', { confirmFilename: '测试.txt' }, teacher, {
        ...env,
        FILES: {
          delete: async () => {
            throw new Error('simulated storage failure');
          },
        },
      }),
    /simulated/,
  );
  assert.equal((await state()).visibility, 'deleting');
  assert.equal((await change('restore')).status, 409);
  assert.equal(
    (await call('/files/m1', 'GET', undefined, student)).status,
    404,
  );
  assert.equal(
    (await change('purge', 'm1', { confirmFilename: '测试.txt' })).status,
    200,
  );
  assert.equal(await env.FILES.head('test/m1'), null);
  assert.equal(
    (await state()).status,
    'cancelled',
    'Deleted bytes no longer count toward quota',
  );
  assert.equal((await (await call('/admin/materials')).json()).files.length, 0);
  assert.equal((await call('/files/m1')).status, 404);
  await env.DB.prepare(
    "INSERT INTO uploads(id,owner_id,kind,title,module,filename,bytes,object_key,multipart_id,status,created_at,completed_at) VALUES('s1','s','submission','作业',1,'作业.txt',4,'test/s1','unused','ready',0,1)",
  ).run();
  await env.FILES.put('test/s1', 'work');
  assert.equal(
    (await change('trash', 's1')).status,
    404,
    'Material management cannot delete student homework',
  );
  assert.equal(
    await (await call('/files/s1', 'GET', undefined, student)).text(),
    'work',
  );
  assert.equal(
    (
      await call('/files/s1', 'GET', undefined, {
        id: 'someone-else',
        role: 'user',
      })
    ).status,
    404,
  );
  assert.ok(
    (
      await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM audit WHERE action='purge-material'",
      ).first()
    ).n === 1,
  );
  console.log(
    'PASS: real isolated D1/R2 tests: migration defaults, roles, hidden-link denial, edit, publish, trash, hidden restore, concurrent stale writes, deletion failure/retry, object removal, quota and homework isolation.',
  );
} finally {
  await proxy.dispose();
}
