import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
const base = process.env.PLATFORM_TEST_URL || 'http://localhost:8790';
const remote = base.startsWith('https://');
const statePath = `learning-platform/private/test-${remote ? 'remote' : 'local'}.json`;
let password;
try {
  password = JSON.parse(await readFile(statePath, 'utf8')).password;
} catch {
  password = (
    await readFile('learning-platform/private/教师首次登录.txt', 'utf8')
  ).match(/临时密码：([^\r\n]+)/)[1];
}
class Client {
  cookie = '';
  async request(
    path,
    method = 'GET',
    data,
    expected = 200,
    raw = false,
    origin = base,
  ) {
    const headers = {
      Origin: origin,
      ...(this.cookie ? { Cookie: this.cookie } : {}),
    };
    if (data !== undefined && !raw)
      headers['Content-Type'] = 'application/json';
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers,
      body: data === undefined ? undefined : raw ? data : JSON.stringify(data),
    });
    const cookie = response.headers.getSetCookie().map((c) => c.split(';')[0]);
    if (cookie.length) this.cookie = cookie.join('; ');
    if (path.startsWith('/files/') && response.ok) {
      assert.equal(response.status, expected);
      return response;
    }
    const result = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${JSON.stringify(result)}`,
    );
    return result;
  }
  async login(username, pass) {
    return this.request('/login', 'POST', { username, password: pass });
  }
}
const anon = new Client();
assert.equal((await anon.request('/me')).user, null);
await anon.request('/admin/users', 'GET', undefined, 401);
await anon.request(
  '/login',
  'POST',
  { username: 'teacher', password: 'irrelevant' },
  403,
  false,
  'https://untrusted.example',
);
console.log('PASS anonymous access and cross-origin mutation rejection');
const teacher = new Client();
await teacher.login('teacher', password);
let me = (await teacher.request('/me')).user;
if (me.mustChangePassword) {
  await teacher.request('/assignments', 'GET', undefined, 403);
  const next = randomBytes(18).toString('base64url');
  await teacher.request('/password', 'POST', {
    currentPassword: password,
    newPassword: next,
  });
  assert.equal((await teacher.request('/me')).user, null);
  password = next;
  await writeFile(statePath, JSON.stringify({ password }));
  await teacher.login('teacher', password);
}
me = (await teacher.request('/me')).user;
assert.equal(me.role, 'teacher');
assert.ok(!('token' in me));
console.log('PASS teacher activation and cookie session');
const suffix = Date.now().toString().slice(-8);
const students = [];
for (let i = 0; i < 2; i++) {
  const credentials = await teacher.request(
    '/admin/users',
    'POST',
    {
      username: `qa${suffix}${i}`,
      name: `验证学生${i + 1}`,
      className: '系统验证',
    },
    201,
  );
  const client = new Client();
  await client.login(credentials.username, credentials.password);
  await client.request('/materials', 'GET', undefined, 403);
  const newPass = randomBytes(18).toString('base64url');
  await client.request('/password', 'POST', {
    currentPassword: credentials.password,
    newPassword: newPass,
  });
  await client.login(credentials.username, newPass);
  const user = (await client.request('/me')).user;
  students.push({
    client,
    user,
    username: credentials.username,
    password: newPass,
  });
}
const [a, b] = students;
await a.client.request('/admin/users', 'GET', undefined, 403);
await a.client.request('/auth/sign-up/email', 'POST', {}, 404);
console.log('PASS closed enrollment and teacher-only administration');
const assignment = await teacher.request(
  '/admin/assignments',
  'POST',
  {
    title: '系统验证作业',
    description: '仅供上线前验证文件与权限。',
    module: 1,
    deadline: null,
  },
  201,
);
async function upload(client, size, name, kind = 'submission') {
  const file = await client.request(
    '/uploads',
    'POST',
    {
      kind,
      title: '系统验证文件',
      assignmentId: assignment.id,
      module: 1,
      filename: name,
      bytes: size,
    },
    201,
  );
  let offset = 0,
    part = 1;
  const hash = createHash('sha256');
  while (offset < size) {
    const chunk = Buffer.alloc(
      Math.min(file.chunkSize, size - offset),
      65 + (part % 26),
    );
    hash.update(chunk);
    await client.request(
      `/uploads/${file.id}/parts/${part}`,
      'PUT',
      chunk,
      200,
      true,
    );
    offset += chunk.length;
    part++;
  }
  const completed = await client.request(
    `/uploads/${file.id}/complete`,
    'POST',
  );
  assert.ok(completed.completedAt);
  await client.request(`/uploads/${file.id}/complete`, 'POST');
  const response = await client.request(`/files/${file.id}`);
  assert.match(response.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const actual = createHash('sha256');
  let downloaded = 0;
  for await (const chunk of response.body) {
    actual.update(chunk);
    downloaded += chunk.length;
  }
  assert.equal(downloaded, size);
  assert.equal(actual.digest('hex'), hash.digest('hex'));
  return file.id;
}
await a.client.request(
  '/uploads',
  'POST',
  { kind: 'material', filename: 'bad.pdf', title: 'bad', module: 1, bytes: 10 },
  403,
);
await a.client.request(
  '/uploads',
  'POST',
  {
    kind: 'submission',
    assignmentId: assignment.id,
    filename: 'bad.exe',
    title: 'bad',
    module: 1,
    bytes: 10,
  },
  400,
);
await a.client.request(
  '/uploads',
  'POST',
  {
    kind: 'submission',
    assignmentId: assignment.id,
    filename: 'big.pdf',
    title: 'big',
    module: 1,
    bytes: 104857601,
  },
  400,
);
const id = await upload(a.client, 1024, '作业验证.txt');
await b.client.request(`/files/${id}`, 'GET', undefined, 404);
const teacherDownload = await teacher.request(`/files/${id}`);
await teacherDownload.body.cancel();
assert.equal(
  (await b.client.request('/submissions')).files.some((f) => f.id === id),
  false,
);
await teacher.request(`/admin/feedback/${id}`, 'POST', {
  grade: 92,
  feedback: '验证反馈',
});
assert.equal(
  (await a.client.request('/submissions')).files.find((f) => f.id === id).grade,
  92,
);
console.log(
  'PASS uploads, byte verification, ownership isolation and teacher feedback',
);
const materialId = await upload(teacher, 1024, '教师资料验证.html', 'material');
const materialResponse = await b.client.request(`/files/${materialId}`);
await materialResponse.body.cancel();
assert.ok(
  (await b.client.request('/materials')).files.some((f) => f.id === materialId),
);
if (!remote || process.env.TEST_LARGE_UPLOAD === '1') {
  await upload(a.client, 100 * 1024 * 1024, '100MB边界验证.zip');
  console.log(
    'PASS complete 100 MiB multipart upload/download with SHA-256 verification',
  );
}
const incomplete = await a.client.request(
  '/uploads',
  'POST',
  {
    kind: 'submission',
    assignmentId: assignment.id,
    title: '未完成',
    module: 1,
    filename: 'incomplete.txt',
    bytes: 1024,
  },
  201,
);
await a.client.request(
  `/uploads/${incomplete.id}/complete`,
  'POST',
  undefined,
  409,
);
await a.client.request(
  `/uploads/${incomplete.id}/parts/1`,
  'PUT',
  Buffer.alloc(2048),
  413,
  true,
);
await a.client.request(`/uploads/${incomplete.id}`, 'DELETE');
await teacher.request(`/admin/assignments/${assignment.id}`, 'PATCH', {
  closed: true,
  deadline: null,
});
await a.client.request(
  '/uploads',
  'POST',
  {
    kind: 'submission',
    assignmentId: assignment.id,
    title: 'closed',
    module: 1,
    filename: 'closed.txt',
    bytes: 10,
  },
  409,
);
console.log('PASS incomplete, oversize and closed-assignment rejection');
const post = await a.client.request(
  '/posts',
  'POST',
  { body: '系统验证讨论', parentId: null },
  201,
);
await b.client.request(
  '/posts',
  'POST',
  { body: '系统验证回复', parentId: post.id },
  201,
);
assert.equal(
  (await a.client.request('/posts')).posts.find((p) => p.id === post.id).replies
    .length,
  1,
);
await teacher.request(`/admin/posts/${post.id}`, 'DELETE');
assert.ok(
  !(await b.client.request('/posts')).posts.some((p) => p.id === post.id),
);
await teacher.request(`/admin/users/${a.user.id}/reset`, 'POST');
assert.equal((await a.client.request('/me')).user, null);
await teacher.request(`/admin/users/${b.user.id}/disable`, 'POST', {
  disabled: true,
});
assert.equal((await b.client.request('/me')).user, null);
await teacher.request(`/admin/users/${a.user.id}/disable`, 'POST', {
  disabled: true,
});
console.log(
  'PASS persistent cross-user discussions, moderation, reset and disable revocation',
);
await writeFile(
  `learning-platform/private/test-${remote ? 'remote' : 'local'}-results.json`,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      base,
      teacherId: me.id,
      users: students.map((s) => s.user.id),
      assignmentId: assignment.id,
      success: true,
    },
    null,
    2,
  ),
);
console.log('ALL PLATFORM INTEGRATION CHECKS PASSED');
