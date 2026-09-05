import { body, consume, integer, json, requireCondition, text } from './http';
import type { Actor } from './worker';

// Filter against the current source visibility on every read: hiding a source
// must also remove its notification and unread badge, even on another device.
const joins = `FROM notifications n
 LEFT JOIN announcements a ON n.kind='announcement' AND a.id=n.source_id
 LEFT JOIN uploads f ON n.kind='feedback' AND f.id=n.source_id
 LEFT JOIN posts p ON n.kind='reply' AND p.id=n.source_id
 LEFT JOIN posts root ON root.id=p.parent_id`;
const visible = `n.recipient_id=? AND (
 (n.kind='announcement' AND a.hidden=0) OR
 (n.kind='feedback' AND f.status='ready' AND f.owner_id=n.recipient_id AND (f.grade IS NOT NULL OR LENGTH(TRIM(f.feedback))>0)) OR
 (n.kind='reply' AND p.hidden=0 AND root.hidden=0))`;

export async function handleActivity(
  request: Request,
  env: PlatformEnv,
  user: Actor,
): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname,
    teacher = user.role === 'admin';
  if (path.startsWith('/api/admin/'))
    requireCondition(teacher, 403, '此操作仅限教师。');
  if (path === '/api/announcements' && request.method === 'GET') {
    const items = (
      await env.DB.prepare(
        'SELECT a.*,u.name AS author FROM announcements a JOIN user u ON u.id=a.author_id WHERE a.hidden=0 ORDER BY a.pinned DESC,a.created_at DESC,a.id DESC LIMIT 50',
      ).all()
    ).results;
    const focus = url.searchParams.get('focusId');
    if (focus) {
      const item = await env.DB.prepare(
        'SELECT * FROM announcements WHERE id=? AND hidden=0',
      )
        .bind(text(focus, 80, '公告编号'))
        .first();
      if (item)
        return json({ items: [item, ...items.filter((a) => a.id !== focus)] });
    }
    return json({ items });
  }
  if (path === '/api/admin/announcements' && request.method === 'GET') {
    return json({
      items: (
        await env.DB.prepare(
          'SELECT * FROM announcements ORDER BY created_at DESC,id DESC LIMIT 100',
        ).all()
      ).results,
    });
  }
  if (path === '/api/admin/announcements' && request.method === 'POST') {
    await consume(env, `announcements:${user.id}`, 3600, 20);
    const data = await body(request),
      id = crypto.randomUUID();
    requireCondition(typeof data.pinned === 'boolean', 400, '请选择是否置顶。');
    await env.DB.prepare(
      'INSERT INTO announcements(id,author_id,title,body,pinned,created_at) VALUES(?,?,?,?,?,?)',
    )
      .bind(
        id,
        user.id,
        text(data.title, 100, '公告标题'),
        text(data.body, 5000, '公告内容'),
        data.pinned ? 1 : 0,
        Date.now(),
      )
      .run();
    return json({ id }, 201);
  }
  const edit = path.match(/^\/api\/admin\/announcements\/([^/]+)$/);
  if (edit && request.method === 'PATCH') {
    const data = await body(request);
    requireCondition(
      typeof data.hidden === 'boolean' && typeof data.pinned === 'boolean',
      400,
      '公告状态不正确。',
    );
    const result = await env.DB.prepare(
      'UPDATE announcements SET hidden=?,pinned=? WHERE id=?',
    )
      .bind(data.hidden ? 1 : 0, data.pinned ? 1 : 0, edit[1])
      .run();
    requireCondition(result.meta.changes, 404, '公告不存在。');
    return json({ ok: true });
  }
  if (path === '/api/notifications' && request.method === 'GET') {
    const before = Number(
      url.searchParams.get('before') || Number.MAX_SAFE_INTEGER,
    );
    integer(before, 1, Number.MAX_SAFE_INTEGER);
    const items = (
      await env.DB.prepare(`SELECT n.*,CASE n.kind WHEN 'announcement' THEN a.title WHEN 'feedback' THEN '作业反馈：' || f.title ELSE '你的讨论收到新回复' END AS title,
   CASE n.kind WHEN 'announcement' THEN 'home' WHEN 'feedback' THEN 'work' ELSE 'discussion' END AS destination,
   CASE n.kind WHEN 'reply' THEN p.parent_id ELSE n.source_id END AS target_id ${joins} WHERE ${visible} AND n.id<? ORDER BY n.id DESC LIMIT 30`)
        .bind(user.id, before)
        .all()
    ).results;
    const summary = await env.DB.prepare(
      `SELECT COUNT(CASE WHEN n.read_at IS NULL THEN 1 END) AS unread,MAX(n.id) AS latest ${joins} WHERE ${visible}`,
    )
      .bind(user.id)
      .first();
    return json({
      items,
      unread: summary?.unread || 0,
      latest: summary?.latest || 0,
      nextBefore: items.length === 30 ? items.at(-1)?.id : null,
    });
  }
  if (path === '/api/notifications/read' && request.method === 'POST') {
    const data = await body(request),
      now = Date.now();
    if (data.id !== undefined) {
      const id = integer(data.id, 1, Number.MAX_SAFE_INTEGER);
      const result = await env.DB.prepare(
        'UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE recipient_id=? AND id=?',
      )
        .bind(now, user.id, id)
        .run();
      requireCondition(result.meta.changes, 404, '通知不存在。');
    } else {
      const through = integer(data.through, 0, Number.MAX_SAFE_INTEGER);
      await env.DB.prepare(
        'UPDATE notifications SET read_at=? WHERE recipient_id=? AND id<=? AND read_at IS NULL',
      )
        .bind(now, user.id, through)
        .run();
    }
    return json({ ok: true });
  }
  requireCondition(false, 404, '接口不存在。');
}
