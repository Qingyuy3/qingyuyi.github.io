import {
  audit,
  body,
  bytes,
  consume,
  HttpError,
  integer,
  json,
  requireCondition,
  text,
} from './http';
import type { Actor } from './worker';

const CHUNK = 5 * 1024 * 1024;
const MAX = 100 * 1024 * 1024;
const allowed = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'zip',
  'ipynb',
  'py',
  'r',
  'html',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
]);
type Upload = {
  id: string;
  owner_id: string;
  kind: string;
  assignment_id: string | null;
  title: string;
  module: number;
  filename: string;
  bytes: number;
  object_key: string;
  multipart_id: string;
  status: string;
  created_at: number;
  completed_at: number | null;
  feedback: string;
  grade: number | null;
  visibility: string;
};
type Assignment = { deadline: number | null; closed: number };
const fields =
  'f.id,f.owner_id,f.kind,f.assignment_id,f.title,f.module,f.filename,f.bytes,f.completed_at,f.feedback,f.grade,u.name';
async function assignmentOpen(env: PlatformEnv, id: string) {
  const assignment = await env.DB.prepare(
    'SELECT deadline,closed FROM assignments WHERE id=?',
  )
    .bind(id)
    .first<Assignment>();
  requireCondition(assignment, 404, '作业不存在。');
  requireCondition(
    !assignment.closed &&
      (!assignment.deadline || Date.now() <= assignment.deadline),
    409,
    '作业已关闭或超过截止时间。',
  );
}
export async function handleUploads(
  request: Request,
  env: PlatformEnv,
  user: Actor,
): Promise<Response> {
  const path = new URL(request.url).pathname,
    teacher = user.role === 'admin';
  if (
    request.method === 'GET' &&
    ['/api/materials', '/api/submissions'].includes(path)
  ) {
    const kind = path === '/api/materials' ? 'material' : 'submission';
    const restricted = kind === 'submission' && !teacher;
    const query = env.DB.prepare(
      `SELECT ${fields} FROM uploads f JOIN user u ON u.id=f.owner_id WHERE f.kind=? AND f.status='ready' ${kind === 'material' ? "AND f.visibility='published'" : ''} ${restricted ? 'AND f.owner_id=?' : ''} ORDER BY f.completed_at DESC LIMIT 2000`,
    );
    return json({
      files: (
        await (restricted ? query.bind(kind, user.id) : query.bind(kind)).all()
      ).results,
    });
  }
  if (path === '/api/uploads' && request.method === 'POST') {
    await consume(env, `upload:${user.id}`, 3600, 30);
    const data = await body(request);
    const kind = data.kind;
    requireCondition(
      kind === 'material' || kind === 'submission',
      400,
      '上传类型不正确。',
    );
    requireCondition(
      kind !== 'material' || teacher,
      403,
      '仅教师可以发布课程资料。',
    );
    const filename = text(data.filename, 160, '文件名');
    requireCondition(
      !/[\\/]/.test(filename) &&
        !Array.from(filename).some(
          (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
        ) &&
        allowed.has(filename.split('.').pop()?.toLowerCase() || ''),
      400,
      '不支持该文件名或文件类型。',
    );
    const size = integer(data.bytes, 1, MAX),
      moduleNumber = integer(data.module, 1, 8);
    const assignmentId =
      kind === 'submission' ? text(data.assignmentId, 80, '作业编号') : null;
    if (assignmentId) await assignmentOpen(env, assignmentId);
    const id = crypto.randomUUID(),
      key = `course-001/${kind}/${assignmentId || `unit-${moduleNumber}`}/${user.id}/${id}`;
    const title = text(data.title || filename, 120, '标题');
    // Object keys never use user-supplied paths. The bucket remains private.
    const multipart = await env.FILES.createMultipartUpload(key, {
      httpMetadata: { contentType: 'application/octet-stream' },
    });
    try {
      const result =
        await env.DB.prepare(`INSERT INTO uploads(id,owner_id,kind,assignment_id,title,module,filename,bytes,object_key,multipart_id,created_at)
        SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE
        (SELECT COALESCE(SUM(bytes),0) FROM uploads WHERE status!='cancelled')+? <= 21474836480 AND
        (SELECT COALESCE(SUM(bytes),0) FROM uploads WHERE owner_id=? AND status!='cancelled')+? <= ? AND
        (SELECT COUNT(*) FROM uploads WHERE owner_id=? AND status IN ('uploading','completing')) < 3 AND
        (? IS NULL OR (SELECT COUNT(*) FROM uploads WHERE owner_id=? AND assignment_id=? AND status!='cancelled')<5)`)
          .bind(
            id,
            user.id,
            kind,
            assignmentId,
            title,
            moduleNumber,
            filename,
            size,
            key,
            multipart.uploadId,
            Date.now(),
            size,
            user.id,
            size,
            teacher ? 10737418240 : 1073741824,
            user.id,
            assignmentId,
            user.id,
            assignmentId,
          )
          .run();
      requireCondition(
        result.meta.changes,
        409,
        '已达存储、重交次数（每份作业 5 次）或未完成上传限额，请联系教师清理。',
      );
    } catch (e) {
      await multipart.abort();
      throw e;
    }
    return json({ id, chunkSize: CHUNK }, 201);
  }
  const download = path.match(/^\/api\/files\/([^/]+)$/);
  if (download && request.method === 'GET') {
    await consume(env, `download:${user.id}`, 3600, 300);
    const file = await env.DB.prepare(
      "SELECT * FROM uploads WHERE id=? AND status='ready'",
    )
      .bind(download[1])
      .first<Upload>();
    requireCondition(
      file &&
        (file.kind === 'material'
          ? file.visibility === 'published' ||
            (teacher && file.visibility === 'hidden')
          : teacher || file.owner_id === user.id),
      404,
      '文件不存在或没有访问权限。',
    );
    const object = await env.FILES.get(file.object_key);
    requireCondition(object, 404, '文件暂时无法读取，请联系教师。');
    // HTML/code uploads must download as attachments, never execute on this origin.
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        'Content-Length': String(object.size),
        'Content-Security-Policy': "sandbox; default-src 'none'",
      },
    });
  }
  if (path === '/api/uploads/cleanup' && request.method === 'POST') {
    requireCondition(teacher, 403, '仅教师可以清理。');
    const pending = await env.DB.prepare(
      "SELECT * FROM uploads WHERE status IN ('uploading','completing') AND created_at<? LIMIT 50",
    )
      .bind(Date.now() - 86400000)
      .all<Upload>();
    let removed = 0;
    for (const file of pending.results) {
      await env.FILES.resumeMultipartUpload(
        file.object_key,
        file.multipart_id,
      ).abort();
      await env.FILES.delete(file.object_key);
      await env.DB.prepare(
        "UPDATE uploads SET status='cancelled' WHERE id=? AND status IN ('uploading','completing')",
      )
        .bind(file.id)
        .run();
      removed++;
    }
    await audit(env, user.id, 'cleanup-uploads', String(removed));
    // Only old throttle windows are discarded, never course records.
    await env.DB.prepare('DELETE FROM counters WHERE expires_at < ?')
      .bind(Date.now())
      .run();
    return json({ removed });
  }
  const route = path.match(
    /^\/api\/uploads\/([^/]+)(?:\/(parts|complete)(?:\/(\d+))?)?$/,
  );
  requireCondition(route, 404, '接口不存在。');
  const [, id, action, partString] = route;
  const file = await env.DB.prepare('SELECT * FROM uploads WHERE id=?')
    .bind(id)
    .first<Upload>();
  requireCondition(
    file && file.owner_id === user.id,
    404,
    '上传不存在或没有访问权限。',
  );
  if (
    action === 'complete' &&
    request.method === 'POST' &&
    file.status === 'ready'
  )
    return json({ id, completedAt: file.completed_at });
  requireCondition(
    file.status === 'uploading',
    409,
    '上传已结束或正在确认，请刷新后查看。',
  );
  requireCondition(
    file.created_at > Date.now() - 86400000,
    410,
    '上传已过期，请重新选择文件。',
  );
  const multipart = env.FILES.resumeMultipartUpload(
    file.object_key,
    file.multipart_id,
  );
  if (!action && request.method === 'DELETE') {
    await multipart.abort();
    await env.DB.prepare(
      "UPDATE uploads SET status='cancelled' WHERE id=? AND status='uploading'",
    )
      .bind(id)
      .run();
    return json({ ok: true });
  }
  if (action === 'parts' && partString && request.method === 'PUT') {
    await consume(env, `upload-part:${user.id}`, 3600, 600);
    const number = integer(
      Number(partString),
      1,
      Math.ceil(file.bytes / CHUNK),
    );
    const expected = Math.min(CHUNK, file.bytes - (number - 1) * CHUNK);
    const chunk = await bytes(request, expected);
    requireCondition(
      chunk.length === expected,
      400,
      '文件分块长度不正确，请重试。',
    );
    const part = await multipart.uploadPart(number, chunk);
    await env.DB.prepare(
      'INSERT INTO upload_parts VALUES(?,?,?,?) ON CONFLICT(upload_id,part_number) DO UPDATE SET etag=excluded.etag,bytes=excluded.bytes',
    )
      .bind(id, number, part.etag, chunk.length)
      .run();
    return json({ ok: true });
  }
  if (action === 'complete' && request.method === 'POST') {
    if (file.assignment_id) await assignmentOpen(env, file.assignment_id);
    const parts = (
      await env.DB.prepare(
        'SELECT part_number,etag,bytes FROM upload_parts WHERE upload_id=? ORDER BY part_number',
      )
        .bind(id)
        .all<{ part_number: number; etag: string; bytes: number }>()
    ).results;
    requireCondition(
      parts.length === Math.ceil(file.bytes / CHUNK) &&
        parts.reduce((sum, p) => sum + p.bytes, 0) === file.bytes &&
        parts.every((p, i) => p.part_number === i + 1),
      409,
      '文件尚未完整上传。',
    );
    const claim = await env.DB.prepare(
      "UPDATE uploads SET status='completing' WHERE id=? AND status='uploading'",
    )
      .bind(id)
      .run();
    requireCondition(claim.meta.changes, 409, '正在确认提交，请稍后刷新。');
    try {
      try {
        await multipart.complete(
          parts.map((p) => ({ partNumber: p.part_number, etag: p.etag })),
        );
      } catch (e) {
        if (!(await env.FILES.head(file.object_key))) throw e;
      }
      const stored = await env.FILES.head(file.object_key);
      requireCondition(
        stored && stored.size === file.bytes,
        409,
        '文件验证失败，请重新上传。',
      );
      const now = Date.now();
      await env.DB.prepare(
        "UPDATE uploads SET status='ready',completed_at=? WHERE id=? AND status='completing'",
      )
        .bind(now, id)
        .run();
      await audit(env, user.id, 'complete-upload', id);
      return json({ id, completedAt: now });
    } catch (e) {
      await env.DB.prepare(
        "UPDATE uploads SET status='uploading' WHERE id=? AND status='completing'",
      )
        .bind(id)
        .run();
      throw e;
    }
  }
  throw new HttpError(405, '操作方式不支持。');
}
