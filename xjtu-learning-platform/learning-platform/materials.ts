import {
  audit,
  body,
  consume,
  integer,
  json,
  requireCondition,
  text,
} from './http';
import type { Actor } from './worker';

type Material = {
  id: string;
  filename: string;
  object_key: string;
  visibility: string;
  material_version: number;
  status: string;
};

export async function handleMaterialAdmin(
  request: Request,
  env: PlatformEnv,
  user: Actor,
) {
  requireCondition(user.role === 'admin', 403, '仅教师可以管理资料。');
  const path = new URL(request.url).pathname;
  if (path === '/api/admin/materials' && request.method === 'GET') {
    const result =
      await env.DB.prepare(`SELECT f.id,f.owner_id,f.title,f.module,f.filename,f.bytes,
      f.completed_at,f.visibility,f.material_version,f.material_updated_at,u.name
      FROM uploads f JOIN user u ON u.id=f.owner_id
      WHERE f.kind='material' AND f.status='ready' AND f.visibility!='deleted'
      ORDER BY f.completed_at DESC LIMIT 2000`).all();
    return json({ files: result.results });
  }
  const route = path.match(
    /^\/api\/admin\/materials\/([^/]+)(?:\/(hide|publish|trash|restore|purge))?$/,
  );
  requireCondition(route, 404, '资料管理接口不存在。');
  const [, id, action] = route;
  requireCondition(
    action ? request.method === 'POST' : request.method === 'PATCH',
    405,
    '操作方式不支持。',
  );
  await consume(env, `manage-material:${user.id}`, 3600, 300);
  const data = await body(request);
  const version = integer(data.version, 0, Number.MAX_SAFE_INTEGER);
  const file = await env.DB.prepare(
    "SELECT * FROM uploads WHERE id=? AND kind='material'",
  )
    .bind(id)
    .first<Material>();
  requireCondition(
    file && file.status === 'ready' && file.visibility !== 'deleted',
    404,
    '资料已不存在，请刷新列表。',
  );
  requireCondition(
    file.material_version === version,
    409,
    '资料已被其他操作更新，请刷新列表后重试。',
  );
  const now = Date.now();
  if (action === 'purge') {
    requireCondition(
      ['trashed', 'deleting'].includes(file.visibility),
      409,
      '请先将资料移入回收站。',
    );
    requireCondition(
      data.confirmFilename === file.filename,
      400,
      '请输入完整文件名以确认彻底删除。',
    );
    // Claim before touching R2. A concurrent restore/edit cannot resurrect the object.
    const claim =
      await env.DB.prepare(`UPDATE uploads SET visibility='deleting',material_version=material_version+1,material_updated_at=?
      WHERE id=? AND material_version=? AND visibility IN ('trashed','deleting') AND status='ready'`)
        .bind(now, id, version)
        .run();
    requireCondition(claim.meta.changes === 1, 409, '资料状态已改变，请刷新。');
    // R2 deletion is idempotent. On failure the tombstone stays non-downloadable,
    // remains counted against quota, and a teacher may explicitly retry deletion.
    await env.FILES.delete(file.object_key);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM upload_parts WHERE upload_id=?').bind(id),
      env.DB.prepare(
        "UPDATE uploads SET visibility='deleted',status='cancelled',material_version=material_version+1,material_updated_at=? WHERE id=? AND visibility='deleting'",
      ).bind(Date.now(), id),
      env.DB.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').bind(
        crypto.randomUUID(),
        user.id,
        'purge-material',
        id,
        Date.now(),
      ),
    ]);
    return json({ ok: true });
  }
  requireCondition(
    ['published', 'hidden', 'trashed'].includes(file.visibility),
    409,
    '资料正在彻底删除，无法修改或恢复。',
  );
  let update: D1PreparedStatement;
  if (!action) {
    requireCondition(
      file.visibility !== 'trashed',
      409,
      '请先从回收站恢复资料。',
    );
    update =
      env.DB.prepare(`UPDATE uploads SET title=?,module=?,material_version=material_version+1,material_updated_at=?
      WHERE id=? AND material_version=? AND visibility IN ('published','hidden') AND status='ready'`).bind(
        text(data.title, 120, '资料标题'),
        integer(data.module, 1, 8),
        now,
        id,
        version,
      );
  } else {
    const transitions: Record<string, { from: string[]; to: string }> = {
      hide: { from: ['published'], to: 'hidden' },
      publish: { from: ['hidden'], to: 'published' },
      trash: { from: ['published', 'hidden'], to: 'trashed' },
      restore: { from: ['trashed'], to: 'hidden' },
    };
    const change = transitions[action];
    requireCondition(
      change && change.from.includes(file.visibility),
      409,
      '当前状态不能执行此操作，请刷新列表。',
    );
    update =
      env.DB.prepare(`UPDATE uploads SET visibility=?,material_version=material_version+1,material_updated_at=?
      WHERE id=? AND material_version=? AND visibility=? AND status='ready'`).bind(
        change.to,
        now,
        id,
        version,
        file.visibility,
      );
  }
  const result = await update.run();
  requireCondition(
    result.meta.changes === 1,
    409,
    '资料已被其他操作更新，请刷新列表。',
  );
  await audit(env, user.id, `${action || 'edit'}-material`, id);
  return json({ ok: true });
}
