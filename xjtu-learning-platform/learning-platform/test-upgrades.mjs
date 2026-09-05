// Isolated local D1/R2 and mocked network only: no live accounts, files or AI calls.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { getPlatformProxy } from 'wrangler-platform';
import { downloadZip } from 'client-zip';
const require = createRequire(import.meta.resolve('vite'));
const { build } = require('esbuild');
const zipRequire = createRequire(import.meta.resolve('exceljs'));
const JSZip = zipRequire('jszip');
const built = await build({
  stdin: {
    contents:
      'export * from "./learning-platform/api-client.ts"; export * from "./learning-platform/submission-model.ts"; export * from "./learning-platform/submissions.ts"; export { handleUploads } from "./learning-platform/uploads.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const {
  api,
  passwordProblem,
  submissionRows,
  downloadBatches,
  safeFilename,
  recordsCsv,
  handleSubmissionOverview,
  handleUploads,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(built.outputFiles[0].text).toString('base64')
);
assert.equal(
  passwordProblem('temporary', 'twelve-chars!', 'twelve-chars!'),
  '',
);
assert.match(passwordProblem('x', 'short', 'short'), /12/);
assert.match(
  passwordProblem('same-password', 'same-password', 'same-password'),
  /相同/,
);
assert.match(passwordProblem('old', 'twelve-chars!', 'different'), /不一致/);
assert.match(
  passwordProblem('old', ' twelve-chars!', ' twelve-chars!'),
  /空格/,
);
const realFetch = globalThis.fetch;
try {
  globalThis.fetch = async () =>
    new Response('<!DOCTYPE html>blocked', {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    });
  await assert.rejects(api('/password', 'POST', {}), /无法确认改密结果/);
  await assert.rejects(api('/me'), /暂时无法连接/);
  globalThis.fetch = async () =>
    new Response('{broken', {
      headers: { 'Content-Type': 'application/json' },
    });
  await assert.rejects(api('/me'), /暂时无法连接/);
  globalThis.fetch = async () =>
    Response.json({ error: '当前密码不正确。' }, { status: 400 });
  await assert.rejects(api('/password', 'POST', {}), /当前密码不正确/);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(api('/password', 'POST', {}), /请勿反复提交/);
  assert.equal(calls, 1, 'Never retry uncertain writes');
  globalThis.fetch = async () => Response.json({ ok: true });
  assert.deepEqual(await api('/login', 'POST', {}), { ok: true });
} finally {
  globalThis.fetch = realFetch;
}
assert.deepEqual(
  downloadBatches(
    [{ bytes: 60 }, { bytes: 40 }, { bytes: 100 }, { bytes: 1 }],
    100,
  ).map((b) => b.length),
  [2, 1, 1],
);
assert.equal(safeFilename('../../test\\file.txt'), '_.._test_file.txt');
assert.ok(!safeFilename('../a/b').includes('/'));
assert.match(recordsCsv([[' =SUM(A1)', '张三']]), /' =SUM/);
const proxy = await getPlatformProxy({
  configPath: 'learning-platform/wrangler.material-test.jsonc',
  persist: false,
  remoteBindings: false,
  envFiles: [],
});
const env = proxy.env,
  teacher = { id: 't', role: 'admin' },
  student = { id: 's1', role: 'user' };
try {
  for (const file of [
    '0001_auth.sql',
    '0002_learning.sql',
    '0003_counter_expiry.sql',
    '0004_material_management.sql',
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
  for (const [id, role, className, banned] of [
    ['t', 'admin', '', 0],
    ['s1', 'user', '一班', 0],
    ['s2', 'user', '一班', 0],
    ['s3', 'user', '二班', 0],
    ['s4', 'user', '二班', 1],
  ]) {
    await env.DB.prepare(
      'INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt,role,banned,mustChangePassword,temporaryExpires,className) VALUES(?,?,?,0,0,0,?,?,0,0,?)',
    )
      .bind(id, '学生' + id, id + '@students.invalid', role, banned, className)
      .run();
  }
  for (const id of ['a', 'b'])
    await env.DB.prepare('INSERT INTO assignments VALUES(?,?,?,1,NULL,0,1)')
      .bind(id, '作业' + id, '说明')
      .run();
  for (const [id, owner, assignment, time, grade, feedback, status] of [
    ['old', 's1', 'a', 1, 90, '不错', 'ready'],
    ['new', 's1', 'a', 2, null, '', 'ready'],
    ['zero', 's2', 'a', 1, 0, '', 'ready'],
    ['draft', 's3', 'a', 1, null, '', 'uploading'],
    ['other', 's3', 'b', 1, null, '有反馈', 'ready'],
    ['disabled', 's4', 'a', 1, null, '反馈', 'ready'],
  ]) {
    await env.DB.prepare(
      "INSERT INTO uploads(id,owner_id,kind,assignment_id,title,module,filename,bytes,object_key,multipart_id,status,created_at,completed_at,grade,feedback) VALUES(?,?,'submission',?,'作业',1,'测试.txt',4,?,'unused',?,0,?,?,?)",
    )
      .bind(id, owner, assignment, id, status, time, grade, feedback)
      .run();
    await env.FILES.put(id, 'data');
  }
  const req = new Request(
    'https://local.test/api/admin/submission-overview?assignmentId=a',
  );
  await assert.rejects(
    handleSubmissionOverview(req, env, student),
    (e) => e.status === 403,
  );
  await assert.rejects(
    handleSubmissionOverview(
      new Request(
        'https://local.test/api/admin/submission-overview?assignmentId=missing',
      ),
      env,
      teacher,
    ),
    (e) => e.status === 404,
  );
  const overview = await (
    await handleSubmissionOverview(req, env, teacher)
  ).json();
  assert.equal(
    overview.users.length,
    4,
    'No teachers in expected student roster',
  );
  assert.equal(
    overview.files.length,
    4,
    'Only ready files in selected assignment',
  );
  const rows = submissionRows(overview);
  assert.equal(
    rows.find((r) => r.user.id === 's1').status,
    'pending',
    'New version overrides old grade',
  );
  assert.equal(rows.find((r) => r.user.id === 's1').versions.length, 2);
  assert.equal(
    rows.find((r) => r.user.id === 's2').status,
    'graded',
    'Zero is a valid grade',
  );
  assert.equal(
    rows.find((r) => r.user.id === 's3').status,
    'missing',
    'Draft and other assignments are not submissions',
  );
  assert.equal(
    rows.find((r) => r.user.id === 's4').status,
    'graded',
    'Feedback without a grade counts',
  );
  assert.equal(rows.filter((r) => !r.user.disabled).length, 3);
  const getFile = (id, actor) =>
    handleUploads(
      new Request('https://local.test/api/files/' + id),
      env,
      actor,
    );
  await assert.rejects(
    getFile('zero', student),
    (e) => e.status === 403 || e.status === 404,
  );
  const selected = rows
    .filter((r) => !r.user.disabled && r.user.className === '一班')
    .flatMap((r) => (r.latest ? [r.latest] : []));
  async function* inputs() {
    for (const file of selected)
      yield {
        name: file.owner_id + '/' + file.filename,
        input: await getFile(file.id, teacher),
      };
  }
  const zip = await JSZip.loadAsync(await downloadZip(inputs()).arrayBuffer(), {
    checkCRC32: true,
  });
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  assert.deepEqual(names.sort(), ['s1/测试.txt', 's2/测试.txt']);
  for (const name of names)
    assert.equal(await zip.file(name).async('string'), 'data');
  await env.DB.prepare("UPDATE uploads SET grade=85 WHERE id='new'").run();
  const refreshed = await (
    await handleSubmissionOverview(req, env, teacher)
  ).json();
  assert.equal(
    submissionRows(refreshed).find((r) => r.user.id === 's1').status,
    'graded',
  );
  console.log(
    'PASS: password rules, HTML/malformed/network errors without write retries, teacher-only overview, latest version/status/class/disabled filters, ZIP Chinese names+CRC+contents, student privacy, refreshed grading.',
  );
} finally {
  await proxy.dispose();
}
