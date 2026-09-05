import { json, requireCondition, text } from './http';
import type { Actor } from './worker';

export async function handleSubmissionOverview(
  request: Request,
  env: PlatformEnv,
  actor: Actor,
) {
  requireCondition(actor.role === 'admin', 403, '此操作仅限教师。');
  const assignments = (
    await env.DB.prepare(
      'SELECT * FROM assignments ORDER BY created_at DESC,id DESC',
    ).all()
  ).results;
  const id =
    new URL(request.url).searchParams.get('assignmentId') ||
    String(assignments[0]?.id || '');
  if (id) {
    text(id, 80, '作业编号');
    requireCondition(
      assignments.some((a) => a.id === id),
      404,
      '找不到作业，请刷新列表。',
    );
  }
  const users = (
    await env.DB.prepare(
      "SELECT id,name,email,className,banned FROM user WHERE COALESCE(role,'user')!='admin' ORDER BY className,email",
    ).all<{
      id: string;
      name: string;
      email: string;
      className: string;
      banned: number;
    }>()
  ).results.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.email.split('@')[0],
    className: u.className || '',
    role: 'student',
    disabled: !!u.banned,
  }));
  const files = id
    ? (
        await env.DB.prepare(
          "SELECT f.id,f.owner_id,f.assignment_id,f.title,f.module,f.filename,f.bytes,f.completed_at,f.feedback,f.grade,u.name FROM uploads f JOIN user u ON u.id=f.owner_id WHERE f.kind='submission' AND f.status='ready' AND f.assignment_id=? ORDER BY f.completed_at DESC,f.id DESC",
        )
          .bind(id)
          .all()
      ).results
    : [];
  return json({ assignments, assignmentId: id, users, files });
}
