import { createAuth } from './auth';
import {
  audit,
  body,
  consume,
  HttpError,
  integer,
  json,
  protect,
  requireCondition,
  text,
} from './http';
import { handleUploads } from './uploads';
import { handleMaterialAdmin } from './materials';
import { handleSubmissionOverview } from './submissions';

type User = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  mustChangePassword: boolean;
  temporaryExpires: number;
  className: string;
};
export type Actor = User;
export const publicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  username: user.email.split('@')[0],
  role: user.role === 'admin' ? 'teacher' : 'student',
  mustChangePassword: !!user.mustChangePassword,
  className: user.className,
});
const email = (username: unknown) => {
  const value = text(username, 32, '账号').toLowerCase();
  requireCondition(
    /^[a-z0-9][a-z0-9_-]{2,31}$/.test(value),
    400,
    '账号应为 3–32 位字母、数字、下划线或短横线。',
  );
  return `${value}@students.invalid`;
};
const tempPassword = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(18)),
    (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[x % 55],
  ).join('');

// Pages supplies ASSETS implicitly; Wrangler's Pages type generator omits it.
type PagesEnv = PlatformEnv & { ASSETS: Fetcher };
async function handle(request: Request, env: PagesEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (path === '/api/health' && request.method === 'GET')
    return json({ ok: true });
  // Same-origin cookies only; reject cross-site mutations even when CORS is bypassed.
  if (!['GET', 'HEAD'].includes(request.method))
    requireCondition(
      request.headers.get('Origin') === env.PUBLIC_ORIGIN,
      403,
      '请求来源不允许。',
    );
  const auth = createAuth(env);
  if (path === '/api/login' && request.method === 'POST') {
    const data = await body(request);
    const address = email(data.username);
    await consume(
      env,
      `login-ip:${request.headers.get('CF-Connecting-IP') || 'local'}`,
      60,
      180, // A classroom may share one campus-network IP address.
    );
    await consume(env, `login-account:${address}`, 900, 15);
    const password = text(data.password, 128, '密码');
    const row = await env.DB.prepare(
      'SELECT mustChangePassword,temporaryExpires FROM user WHERE email=?',
    )
      .bind(address)
      .first<{ mustChangePassword: number; temporaryExpires: number }>();
    if (row?.mustChangePassword && row.temporaryExpires < Date.now())
      throw new HttpError(
        401,
        '账号或密码无效，或临时密码已过期，请联系教师。',
      );
    const response = await auth.api.signInEmail({
      body: { email: address, password },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok)
      return json({ error: '账号或密码无效，请检查后重试。' }, 401);
    // Do not expose session tokens in the JSON body.
    return new Response(JSON.stringify({ ok: true }), {
      headers: response.headers,
    });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session
    ? await env.DB.prepare(
        'SELECT id,name,email,role,banned,mustChangePassword,temporaryExpires,className FROM user WHERE id=?',
      )
        .bind(session.user.id)
        .first<User>()
    : null;
  if (path === '/api/me' && request.method === 'GET')
    return json({ user: user && !user.banned ? publicUser(user) : null });
  requireCondition(user && !user.banned, 401, '请先登录课程账号。');
  if (path === '/api/logout' && request.method === 'POST')
    return auth.api.signOut({ headers: request.headers, asResponse: true });
  if (path === '/api/password' && request.method === 'POST') {
    const data = await body(request);
    await consume(env, `password:${user.id}`, 900, 10);
    const newPassword = text(data.newPassword, 128, '新密码');
    const currentPassword = text(data.currentPassword, 128, '当前密码');
    requireCondition(
      newPassword.length >= 12 && newPassword !== currentPassword,
      400,
      '新密码至少 12 位，且不能与旧密码相同。',
    );
    const result = await auth.api.changePassword({
      headers: request.headers,
      body: { newPassword, currentPassword, revokeOtherSessions: true },
      asResponse: true,
    });
    if (!result.ok) {
      const failure = (await result.json().catch(() => null)) as {
        code?: string;
      } | null;
      return json(
        {
          error:
            failure?.code === 'INVALID_PASSWORD'
              ? '当前密码不正确。首次登录请填写教师提供的临时密码，并检查是否多粘贴了空格。'
              : '密码未能更新。请检查当前密码；新密码需为 12–128 位且不同于当前密码。',
        },
        400,
      );
    }
    // Revoke every session; a fresh sign-in prevents session fixation after activation.
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE user SET mustChangePassword=0, temporaryExpires=0 WHERE id=?',
      ).bind(user.id),
      env.DB.prepare('DELETE FROM session WHERE userId=?').bind(user.id),
    ]);
    return json({ ok: true });
  }
  requireCondition(!user.mustChangePassword, 403, '请先修改临时密码。');
  const teacher = user.role === 'admin';
  if (path.startsWith('/api/admin/'))
    requireCondition(teacher, 403, '此操作仅限教师。');

  if (path === '/api/admin/submission-overview' && request.method === 'GET')
    return handleSubmissionOverview(request, env, user);

  if (path === '/api/admin/users' && request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id,name,email,role,banned,mustChangePassword,temporaryExpires,className FROM user ORDER BY createdAt',
    ).all<User>();
    return json({
      users: result.results.map((u) => ({
        ...publicUser(u),
        disabled: !!u.banned,
      })),
    });
  }
  if (path === '/api/admin/users' && request.method === 'POST') {
    await consume(env, `provision:${user.id}`, 3600, 100);
    const data = await body(request);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM user').first<{
      n: number;
    }>();
    requireCondition(count && count.n < 80, 409, '试运行最多开通 80 个账号。');
    const address = email(data.username),
      name = text(data.name, 60, '姓名');
    const existing = await env.DB.prepare('SELECT id FROM user WHERE email=?')
      .bind(address)
      .first();
    requireCondition(!existing, 409, '账号已存在，请勿重复导入。');
    const password = tempPassword();
    const created = await auth.api.createUser({
      body: {
        email: address,
        name,
        password,
        role: 'user',
        data: {
          className: text(data.className ?? '', 60, '班级', true),
          mustChangePassword: true,
          temporaryExpires: Date.now() + 7 * 86400000,
        },
      },
    });
    await audit(env, user.id, 'create-user', created.user.id);
    return json({ username: address.split('@')[0], name, password }, 201);
  }
  const accountAction = path.match(
    /^\/api\/admin\/users\/([^/]+)\/(reset|disable)$/,
  );
  if (accountAction && request.method === 'POST') {
    const [, id, action] = accountAction;
    const target = await env.DB.prepare('SELECT role FROM user WHERE id=?')
      .bind(id)
      .first<{ role: string }>();
    requireCondition(
      target && target.role !== 'admin',
      403,
      '此页面只管理学生账号。',
    );
    if (action === 'reset') {
      const password = tempPassword();
      // Mark as activation-required before password reset; fail closed if interrupted.
      await env.DB.prepare(
        'UPDATE user SET mustChangePassword=1,temporaryExpires=? WHERE id=?',
      )
        .bind(Date.now() + 7 * 86400000, id)
        .run();
      await auth.api.setUserPassword({
        headers: request.headers,
        body: { userId: id, newPassword: password },
      });
      await env.DB.prepare('DELETE FROM session WHERE userId=?').bind(id).run();
      await audit(env, user.id, 'reset-password', id);
      return json({ password });
    }
    const data = await body(request);
    requireCondition(
      typeof data.disabled === 'boolean',
      400,
      '停用状态不正确。',
    );
    if (data.disabled)
      await auth.api.banUser({
        headers: request.headers,
        body: { userId: id, banReason: '教师停用' },
      });
    else
      await auth.api.unbanUser({
        headers: request.headers,
        body: { userId: id },
      });
    await audit(
      env,
      user.id,
      data.disabled ? 'disable-user' : 'enable-user',
      id,
    );
    return json({ ok: true });
  }
  if (path === '/api/assignments' && request.method === 'GET')
    return json({
      assignments: (
        await env.DB.prepare(
          'SELECT * FROM assignments ORDER BY module,created_at',
        ).all()
      ).results,
    });
  if (path === '/api/admin/assignments' && request.method === 'POST') {
    const data = await body(request),
      id = crypto.randomUUID();
    const deadline =
      data.deadline === null ? null : integer(data.deadline, 0, 4102444800000);
    await env.DB.prepare('INSERT INTO assignments VALUES(?,?,?,?,?,0,?)')
      .bind(
        id,
        text(data.title, 120, '作业标题'),
        text(data.description, 5000, '作业要求'),
        integer(data.module, 1, 8),
        deadline,
        Date.now(),
      )
      .run();
    await audit(env, user.id, 'create-assignment', id);
    return json({ id }, 201);
  }
  const editAssignment = path.match(/^\/api\/admin\/assignments\/([^/]+)$/);
  if (editAssignment && request.method === 'PATCH') {
    const data = await body(request);
    requireCondition(typeof data.closed === 'boolean', 400, '关闭状态不正确。');
    const deadline =
      data.deadline === null ? null : integer(data.deadline, 0, 4102444800000);
    const result = await env.DB.prepare(
      'UPDATE assignments SET deadline=?,closed=? WHERE id=?',
    )
      .bind(deadline, data.closed ? 1 : 0, editAssignment[1])
      .run();
    requireCondition(result.meta.changes, 404, '找不到作业。');
    await audit(env, user.id, 'update-assignment', editAssignment[1]);
    return json({ ok: true });
  }
  if (
    path === '/api/admin/materials' ||
    path.startsWith('/api/admin/materials/')
  )
    return handleMaterialAdmin(request, env, user);
  if (
    path.startsWith('/api/uploads') ||
    path.startsWith('/api/files') ||
    path === '/api/materials' ||
    path === '/api/submissions'
  )
    return handleUploads(request, env, user);
  const feedback = path.match(/^\/api\/admin\/feedback\/([^/]+)$/);
  if (feedback && request.method === 'POST') {
    const data = await body(request);
    const grade = data.grade === null ? null : integer(data.grade, 0, 100);
    const result = await env.DB.prepare(
      "UPDATE uploads SET feedback=?,grade=? WHERE id=? AND kind='submission' AND status='ready'",
    )
      .bind(text(data.feedback ?? '', 3000, '反馈', true), grade, feedback[1])
      .run();
    requireCondition(result.meta.changes, 404, '找不到已提交作业。');
    await audit(env, user.id, 'grade-submission', feedback[1]);
    return json({ ok: true });
  }
  if (path === '/api/posts' && request.method === 'GET') {
    const before = Number(url.searchParams.get('before') || Date.now() + 1);
    requireCondition(Number.isSafeInteger(before), 400, '分页参数不正确。');
    const roots = await env.DB.prepare(
      'SELECT p.*,u.name FROM posts p JOIN user u ON u.id=p.author_id WHERE p.parent_id IS NULL AND p.hidden=0 AND p.created_at<? ORDER BY p.created_at DESC LIMIT 30',
    )
      .bind(before)
      .all();
    const ids = roots.results.map((p) => String(p.id));
    const replies = ids.length
      ? (
          await env.DB.prepare(
            `SELECT p.*,u.name FROM posts p JOIN user u ON u.id=p.author_id WHERE p.hidden=0 AND p.parent_id IN (${ids.map(() => '?').join(',')}) ORDER BY p.created_at LIMIT 3000`,
          )
            .bind(...ids)
            .all()
        ).results
      : [];
    return json({
      posts: roots.results.map((p) => ({
        ...p,
        replies: replies.filter((r) => r.parent_id === p.id),
      })),
      nextBefore:
        roots.results.length === 30 ? roots.results.at(-1)?.created_at : null,
    });
  }
  if (path === '/api/posts' && request.method === 'POST') {
    await consume(env, `posts:${user.id}`, 60, 10);
    const data = await body(request),
      parent =
        data.parentId === null ? null : text(data.parentId, 80, '讨论编号');
    if (parent) {
      const root = await env.DB.prepare(
        'SELECT id FROM posts WHERE id=? AND parent_id IS NULL AND hidden=0',
      )
        .bind(parent)
        .first();
      requireCondition(root, 404, '原讨论已不存在。');
      const total = await env.DB.prepare(
        'SELECT COUNT(*) AS n FROM posts WHERE parent_id=?',
      )
        .bind(parent)
        .first<{ n: number }>();
      requireCondition(
        total && total.n < 100,
        409,
        '本帖回复已达上限，请新建讨论。',
      );
    }
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO posts VALUES(?,?,?,?,?,0)')
      .bind(id, user.id, parent, text(data.body, 3000, '讨论内容'), Date.now())
      .run();
    return json({ id }, 201);
  }
  const moderation = path.match(/^\/api\/admin\/posts\/([^/]+)$/);
  if (moderation && request.method === 'DELETE') {
    await env.DB.prepare('UPDATE posts SET hidden=1 WHERE id=? OR parent_id=?')
      .bind(moderation[1], moderation[1])
      .run();
    await audit(env, user.id, 'hide-post', moderation[1]);
    return json({ ok: true });
  }
  if (path === '/api/ta' && request.method === 'POST') {
    const data = await body(request);
    requireCondition(Array.isArray(data.messages), 400, '问题格式不正确。');
    await consume(env, `ta:${user.id}`, 86400, 20);
    await consume(env, 'ta:course', 86400, 200);
    const headers = new Headers({
      'Content-Type': 'application/json',
      Origin: 'https://qingyuy3.github.io',
    });
    const response = await env.TA_WORKER.fetch(
      new Request('https://ta.internal/api/ta', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }),
    );
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  throw new HttpError(404, '接口不存在。');
}

export default {
  async fetch(request: Request, env: PagesEnv): Promise<Response> {
    try {
      return protect(await handle(request, env));
    } catch (error) {
      if (error instanceof HttpError)
        return protect(json({ error: error.message }, error.status));
      console.error(
        JSON.stringify({
          event: 'platform-error',
          path: new URL(request.url).pathname,
          type: error instanceof Error ? error.name : 'unknown',
        }),
      );
      return protect(json({ error: '操作未完成，请稍后重试。' }, 500));
    }
  },
} satisfies ExportedHandler<PagesEnv>;
