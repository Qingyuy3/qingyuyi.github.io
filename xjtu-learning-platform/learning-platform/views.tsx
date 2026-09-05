'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, useLearning, type LearningUser } from './session';
import { MaterialManager } from './material-manager';
import { SubmissionOverview } from './submission-overview';
import { AnnouncementsAdmin } from './activity-ui';
import {
  parseRoster,
  mergeCredential,
  credentialsWorkbook,
  type Credential,
} from './roster';
import type { ViewKey } from '@/components/course-views';
import {
  date,
  uploadFile,
  type Assignment,
  type CourseFile,
} from './file-client';

function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
    >
      {message}
    </p>
  ) : null;
}
function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 border-l-4 border-brand-blue pl-4">
      <h1 className="text-2xl font-semibold text-brand-blue">{title}</h1>
      {children && (
        <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      )}
    </div>
  );
}
function UnitSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      所属学习单元
      <select
        className="mt-2 block h-10 w-full rounded-lg border bg-card px-3"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <option key={i} value={i + 1}>
            第 {i + 1} 单元
          </option>
        ))}
      </select>
    </label>
  );
}
function Download({ file }: { file: CourseFile }) {
  return (
    <a
      className="font-medium text-primary underline underline-offset-4"
      href={`/api/files/${file.id}`}
    >
      {file.filename}
    </a>
  );
}

export function OnlineWork({ focusId = '' }: { focusId?: string }) {
  const [tasks, setTasks] = useState<Assignment[]>([]),
    [files, setFiles] = useState<CourseFile[]>([]),
    [selected, setSelected] = useState(''),
    [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [notice, setNotice] = useState(''),
    [loading, setLoading] = useState(true);
  const task = tasks.find((t) => t.id === selected);
  async function refresh() {
    const [a, b] = await Promise.all([
      api<{ assignments: Assignment[] }>('/assignments'),
      api<{ files: CourseFile[] }>('/submissions'),
    ]);
    setTasks(a.assignments);
    setFiles(b.files);
    setSelected(
      (current) =>
        current ||
        a.assignments.find((t) => t.id === focusId)?.id ||
        b.files.find((f) => f.id === focusId)?.assignment_id ||
        a.assignments[0]?.id ||
        '',
    );
  }
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <Heading title="作业提交">
        提交结果由服务器确认；同一作业可以提交最多 5 个版本。
      </Heading>
      <ErrorNotice message={error} />
      {loading ? (
        <p>正在读取作业……</p>
      ) : !tasks.length ? (
        <Card>
          <CardContent>教师尚未发布作业。</CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {tasks.map((t) => (
              <button
                disabled={busy}
                className={`rounded-xl border p-4 text-left ${selected === t.id ? 'border-primary bg-secondary' : 'bg-card'}`}
                key={t.id}
                onClick={() => {
                  setSelected(t.id);
                  setFile(null);
                  setNotice('');
                }}
              >
                <p className="text-sm text-muted-foreground">
                  第 {t.module} 单元
                </p>
                <strong className="mt-1 block">{t.title}</strong>
                <p className="mt-2 text-sm">
                  {t.closed
                    ? '已关闭'
                    : t.deadline
                      ? `截止：${date(t.deadline)}`
                      : '截止时间待教师设置'}
                </p>
              </button>
            ))}
          </div>
          {task && (
            <Card>
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-5 whitespace-pre-wrap leading-7">
                  {task.description}
                </p>
                <label className="block rounded-xl border-2 border-dashed p-6 text-sm">
                  选择作业文件（最大 100 MB）
                  <input
                    key={selected}
                    disabled={busy}
                    className="mt-3 block max-w-full"
                    type="file"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setNotice('');
                    }}
                  />
                </label>
                {busy && (
                  <div role="status" className="mt-4 text-sm">
                    <progress className="w-full" value={progress} max={100} />
                    {progress < 95 ? `正在上传 ${progress}%` : '正在确认提交……'}
                    ，请保持页面打开。
                  </div>
                )}
                {notice && (
                  <p role="status" className="mt-4 text-brand-blue">
                    {notice}
                  </p>
                )}
                <Button
                  className="mt-4"
                  disabled={
                    !file ||
                    busy ||
                    !!task.closed ||
                    !!(task.deadline && Date.now() > task.deadline)
                  }
                  onClick={async () => {
                    if (!file) return;
                    setBusy(true);
                    setError('');
                    setNotice('');
                    setProgress(0);
                    try {
                      const result = await uploadFile(
                        file,
                        {
                          kind: 'submission',
                          title: task.title,
                          module: task.module,
                          assignmentId: task.id,
                        },
                        setProgress,
                      );
                      setNotice(`提交成功 · ${date(result.completedAt)}`);
                      setFile(null);
                      await refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : '上传失败，请刷新检查提交记录后重试。',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  确认提交
                </Button>
              </CardContent>
            </Card>
          )}
          <h2 className="mb-3 mt-7 text-lg font-semibold">提交记录与反馈</h2>
          <div className="space-y-3">
            {files
              .filter((f) => f.assignment_id === selected)
              .map((f) => (
                <Card key={f.id}>
                  <CardContent>
                    <Download file={f} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {f.name} · {date(f.completed_at)} ·{' '}
                      {(f.bytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {f.grade !== null && (
                      <p className="mt-3">成绩：{f.grade} / 100</p>
                    )}
                    {f.feedback && (
                      <p className="mt-2 whitespace-pre-wrap">
                        教师反馈：{f.feedback}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            {!files.some((f) => f.assignment_id === selected) && (
              <p className="text-sm text-muted-foreground">暂无提交记录。</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

export function OnlineCalendar({
  setView,
}: {
  setView: (view: ViewKey) => void;
}) {
  const [tasks, setTasks] = useState<Assignment[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    api<{ assignments: Assignment[] }>('/assignments')
      .then((r) => setTasks(r.assignments))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Heading title="课程日历">以教师发布的作业及截止时间为准。</Heading>
      <ErrorNotice message={error} />
      <div className="space-y-3">
        {[...tasks]
          .sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity))
          .map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    第 {t.module} 单元 ·{' '}
                    {t.closed
                      ? '已关闭'
                      : t.deadline
                        ? `截止 ${date(t.deadline)}`
                        : '未设置截止时间'}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setView('work')}>
                  查看作业与提交
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </>
  );
}

export function OnlineMaterials() {
  const [files, setFiles] = useState<CourseFile[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    api<{ files: CourseFile[] }>('/materials')
      .then((r) => setFiles(r.files))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section className="mb-7">
      <h2 className="mb-4 text-xl font-semibold text-brand-blue">
        本学期新增资料
      </h2>
      <ErrorNotice message={error} />
      {!files.length && !error ? (
        <p className="text-sm text-muted-foreground">
          暂无新增资料，下方可查看已有课程资料。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((f) => (
            <Card key={f.id}>
              <CardContent>
                <p className="mb-2 font-medium">{f.title}</p>
                <Download file={f} />
                <p className="mt-2 text-sm text-muted-foreground">
                  第 {f.module} 单元 · {(f.bytes / 1024 / 1024).toFixed(2)} MB
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

type Post = {
  id: string;
  name: string;
  body: string;
  created_at: number;
  replies: Post[];
};
export function OnlineDiscussion({
  focusId = '',
  clearFocus,
}: {
  focusId?: string;
  clearFocus?: () => void;
}) {
  const teacher = useLearning()?.user.role === 'teacher';
  const [posts, setPosts] = useState<Post[]>([]),
    [draft, setDraft] = useState(''),
    [reply, setReply] = useState<Record<string, string>>({}),
    [open, setOpen] = useState(focusId),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [next, setNext] = useState<number | null>(null);
  async function refresh(older = false) {
    const result = await api<{ posts: Post[]; nextBefore: number | null }>(
      `/posts${focusId ? '?threadId=' + encodeURIComponent(focusId) : older && next ? `?before=${next}` : ''}`,
    );
    setPosts((p) => (older ? [...p, ...result.posts] : result.posts));
    setNext(result.nextBefore);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  async function send(parentId: string | null) {
    setBusy(true);
    setError('');
    try {
      await api('/posts', 'POST', {
        body: parentId ? reply[parentId] : draft,
        parentId,
      });
      if (parentId) setReply((r) => ({ ...r, [parentId]: '' }));
      else setDraft('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading title="课程讨论">
        与同学和老师交流。请勿发布密码或个人敏感信息。
      </Heading>
      {focusId && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-muted-foreground">
            正在查看通知关联的讨论。若列表为空，讨论可能已被隐藏。
          </p>
          <Button variant="outline" onClick={clearFocus}>
            返回全部讨论
          </Button>
        </div>
      )}
      <ErrorNotice message={error} />
      <Card className="mb-5">
        <CardContent>
          <Textarea
            aria-label="新讨论"
            value={draft}
            maxLength={3000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="写下你的问题或学习心得……"
          />
          <div className="mt-3 flex justify-between">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void refresh().catch((e) => setError(e.message))}
            >
              刷新讨论
            </Button>
            <Button
              disabled={busy || !draft.trim()}
              onClick={() => void send(null)}
            >
              发布讨论
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">
                  {p.name}
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    {date(p.created_at)}
                  </span>
                </p>
                {teacher && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('隐藏这条讨论及其回复？')) return;
                      try {
                        await api(`/admin/posts/${p.id}`, 'DELETE');
                        await refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : '操作失败。');
                      }
                    }}
                  >
                    隐藏
                  </Button>
                )}
              </div>
              <p className="my-3 whitespace-pre-wrap break-words leading-7">
                {p.body}
              </p>
              <Button
                variant="outline"
                size="sm"
                aria-expanded={open === p.id}
                onClick={() => setOpen(open === p.id ? '' : p.id)}
              >
                回复（{p.replies.length}）
              </Button>
              {open === p.id && (
                <div className="mt-4 space-y-3 border-l-2 pl-4">
                  {p.replies.map((r) => (
                    <div key={r.id} className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-sm font-medium">
                        {r.name} · {date(r.created_at)}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words">
                        {r.body}
                      </p>
                    </div>
                  ))}
                  <Textarea
                    aria-label={`回复 ${p.name}`}
                    maxLength={3000}
                    value={reply[p.id] || ''}
                    onChange={(e) =>
                      setReply((r) => ({ ...r, [p.id]: e.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    disabled={busy || !reply[p.id]?.trim()}
                    onClick={() => void send(p.id)}
                  >
                    发送回复
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {next && (
        <Button
          className="mt-5"
          onClick={() => void refresh(true).catch((e) => setError(e.message))}
        >
          查看更早讨论
        </Button>
      )}
      {!posts.length && !error && (
        <p className="text-muted-foreground">
          还没有讨论，欢迎提出第一个问题。
        </p>
      )}
    </>
  );
}

export function TeacherAdmin() {
  return (
    <>
      <Heading title="教学管理">
        账号由教师统一开通，学生作业仅本人及教师可见。
      </Heading>
      <Tabs defaultValue="users">
        <TabsList className="mb-5 flex-wrap">
          <TabsTrigger value="users">学生账号</TabsTrigger>
          <TabsTrigger value="assignments">发布作业</TabsTrigger>
          <TabsTrigger value="materials">资料管理</TabsTrigger>
          <TabsTrigger value="feedback">提交与反馈</TabsTrigger>
          <TabsTrigger value="announcements">课程公告</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersAdmin />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsAdmin />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsAdmin />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackAdmin />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementsAdmin />
        </TabsContent>
      </Tabs>
    </>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState<LearningUser[]>([]),
    [roster, setRoster] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [credentials, setCredentials] = useState<Credential[]>([]),
    [progress, setProgress] = useState(''),
    [loaded, setLoaded] = useState(false);
  let preview: ReturnType<typeof parseRoster> = [],
    previewError = '';
  try {
    preview = parseRoster(
      roster,
      users.map((u) => u.username),
    );
  } catch (e) {
    previewError = e instanceof Error ? e.message : '名单格式有误';
  }
  const invalid = preview.some((row) => row.error);
  async function refresh() {
    setUsers((await api<{ users: LearningUser[] }>('/admin/users')).users);
    setLoaded(true);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-5">
      <ErrorNotice message={error} />
      <Card>
        <CardHeader>
          <CardTitle>批量开通学生账号</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm leading-6 text-muted-foreground">
            在 Excel
            中选中所有学生的“账号、姓名、班级”三列，一次复制，粘贴到下方即可；不用逐行操作。
            班级可留空，表头和空行会自动跳过。手动输入也支持空格或逗号分隔。
            账号使用 3–32 位字母或数字，可包含下划线和短横线；有前导零的账号请在
            Excel 中设为文本。
          </p>
          <Textarea
            aria-label="学生名单"
            className="min-h-32"
            value={roster}
            disabled={busy}
            onChange={(e) => setRoster(e.target.value)}
            placeholder={
              '账号\t姓名\t班级\n2026001\t张同学\t一班\n2026002\t李同学\t一班'
            }
          />
          <ErrorNotice message={previewError} />
          {preview.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm" role="status">
                识别到 {preview.length} 人 ·{' '}
                {preview.filter((r) => r.error).length} 行需要修改
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">行</th>
                      <th>账号</th>
                      <th>姓名</th>
                      <th>班级</th>
                      <th>检查结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.line} className="border-t">
                        <td className="p-2">{row.line}</td>
                        <td>{row.username || '—'}</td>
                        <td>{row.name || '—'}</td>
                        <td>{row.className || '—'}</td>
                        <td
                          className={
                            row.error ? 'text-red-700' : 'text-brand-blue'
                          }
                        >
                          {row.error || '可以开通'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {progress && (
            <p className="mt-3 text-sm" role="status">
              {progress}
            </p>
          )}
          <Button
            className="mt-4"
            disabled={
              busy || !loaded || !preview.length || !!previewError || invalid
            }
            onClick={async () => {
              setBusy(true);
              setError('');
              const failed: string[] = [];
              const remaining: string[] = [];
              let completed = 0;
              try {
                for (const [index, row] of preview.entries()) {
                  const { username, name, className } = row;
                  setProgress(
                    `正在开通 ${index + 1} / ${preview.length}：${name}`,
                  );
                  try {
                    const account = await api<{
                      username: string;
                      name: string;
                      password: string;
                    }>('/admin/users', 'POST', { username, name, className });
                    setCredentials((old) =>
                      mergeCredential(old, { ...account, className }),
                    );
                    completed++;
                  } catch (e) {
                    remaining.push([username, name, className].join('\t'));
                    failed.push(
                      `${username}：${e instanceof Error ? e.message : '创建失败'}`,
                    );
                  }
                }
                setRoster(remaining.join('\n'));
                setProgress(
                  `已开通 ${completed} 人${failed.length ? `，${failed.length} 人未确认成功，名单已保留。请先核对账号列表再重试。` : '，请在下方导出账号表。'}`,
                );
                if (failed.length) setError(failed.join('；'));
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : '导入失败。');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? '正在逐个开通……'
              : `确认开通${preview.length ? ` ${preview.length} 个` : ''}账号`}
          </Button>
        </CardContent>
      </Card>
      {credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>本次生成的临时凭据</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm">
              请先导出保存，再离开页面。临时密码仅在当前页面显示，不会保存在浏览器中。
              请分别发给对应学生，不要把整份名单发到群里。
            </p>
            <Button
              className="mb-3"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const blob = new Blob(
                    [
                      await credentialsWorkbook(
                        credentials,
                        window.location.origin + '/',
                      ),
                    ],
                    {
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    },
                  );
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `学生账号与临时密码-${new Date().toISOString().slice(0, 10)}.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch {
                  setError(
                    '导出失败，账号密码仍保留在页面中。请检查网络后重新点击导出，不要刷新页面。',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              导出账号表（.xlsx）
            </Button>
            <p className="mb-3 text-sm text-muted-foreground">
              下载后可直接用 Excel 或 WPS 打开，账号前导零会保留。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2">账号</th>
                    <th>姓名</th>
                    <th>班级</th>
                    <th>临时密码</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((c, i) => (
                    <tr className="border-t" key={i}>
                      <td className="p-2">{c.username}</td>
                      <td>{c.name}</td>
                      <td>{c.className || '—'}</td>
                      <td className="font-mono">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="outline"
              className="mt-3"
              disabled={busy}
              onClick={() => {
                if (
                  confirm('确定已导出或保存所有临时密码？清除后无法再次查看。')
                )
                  setCredentials([]);
              }}
            >
              我已妥善保存，清除显示
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>账号列表（{users.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">姓名 / 账号</th>
                  <th>班级</th>
                  <th>状态</th>
                  <th>管理</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">
                      {u.name}
                      <p className="text-muted-foreground">{u.username}</p>
                    </td>
                    <td>{u.className || '—'}</td>
                    <td>
                      {u.role === 'teacher'
                        ? '教师'
                        : u.disabled
                          ? '已停用'
                          : u.mustChangePassword
                            ? '待激活'
                            : '已激活'}
                    </td>
                    <td>
                      {u.role !== 'teacher' && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={async () => {
                              if (
                                !confirm(
                                  `重置 ${u.name} 的密码并使原登录失效？`,
                                )
                              )
                                return;
                              setBusy(true);
                              try {
                                const result = await api<{ password: string }>(
                                  `/admin/users/${u.id}/reset`,
                                  'POST',
                                );
                                setCredentials((old) =>
                                  mergeCredential(old, {
                                    username: u.username,
                                    name: u.name,
                                    className: u.className,
                                    password: result.password,
                                  }),
                                );
                                await refresh();
                              } catch (e) {
                                setError(
                                  e instanceof Error ? e.message : '操作失败。',
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            重置密码
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={async () => {
                              if (
                                !confirm(
                                  `${u.disabled ? '启用' : '停用'} ${u.name} 的账号？`,
                                )
                              )
                                return;
                              setBusy(true);
                              try {
                                await api(
                                  `/admin/users/${u.id}/disable`,
                                  'POST',
                                  { disabled: !u.disabled },
                                );
                                await refresh();
                              } catch (e) {
                                setError(
                                  e instanceof Error ? e.message : '操作失败。',
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {u.disabled ? '启用' : '停用'}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignmentsAdmin() {
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [module, setModule] = useState(1),
    [deadline, setDeadline] = useState(''),
    [tasks, setTasks] = useState<Assignment[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function refresh() {
    setTasks(
      (await api<{ assignments: Assignment[] }>('/assignments')).assignments,
    );
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <ErrorNotice message={error} />
      <Card>
        <CardHeader>
          <CardTitle>发布课程作业</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/admin/assignments', 'POST', {
                  title,
                  description,
                  module,
                  deadline: deadline ? new Date(deadline).getTime() : null,
                });
                setTitle('');
                setDescription('');
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : '发布失败。');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-sm">
              作业标题
              <Input
                className="mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <UnitSelect value={module} onChange={setModule} />
            <label className="block text-sm">
              作业要求
              <Textarea
                className="mt-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={5000}
              />
            </label>
            <label className="block text-sm">
              截止时间（按此设备时区，可留空）
              <Input
                className="mt-2"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              发布作业
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-5 space-y-3">
        {tasks.map((t) => (
          <AssignmentSettings
            key={t.id}
            task={t}
            refresh={refresh}
            report={setError}
          />
        ))}
      </div>
    </>
  );
}
function AssignmentSettings({
  task,
  refresh,
  report,
}: {
  task: Assignment;
  refresh: () => Promise<void>;
  report: (s: string) => void;
}) {
  const [deadline, setDeadline] = useState(
      task.deadline
        ? new Date(
            task.deadline - new Date(task.deadline).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : '',
    ),
    [busy, setBusy] = useState(false);
  async function save(closed: boolean) {
    setBusy(true);
    try {
      await api(`/admin/assignments/${task.id}`, 'PATCH', {
        deadline: deadline ? new Date(deadline).getTime() : null,
        closed,
      });
      await refresh();
    } catch (e) {
      report(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardContent>
        <p className="font-semibold">
          {task.title} · {task.closed ? '已关闭' : '开放中'}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            截止时间
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void save(!!task.closed)}
          >
            保存时间
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void save(!task.closed)}
          >
            {task.closed ? '重新开放' : '关闭提交'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialsAdmin() {
  const [revision, setRevision] = useState(0);
  const [title, setTitle] = useState(''),
    [module, setModule] = useState(1),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  return (
    <>
      <ErrorNotice message={error} />
      <Card>
        <CardHeader>
          <CardTitle>上传本学期资料</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) return;
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await uploadFile(
                  file,
                  { kind: 'material', title, module },
                  setProgress,
                );
                setNotice('资料已发布，可在资料中心下载。');
                setRevision((n) => n + 1);
                setFile(null);
                setTitle('');
              } catch (e) {
                setError(e instanceof Error ? e.message : '上传失败。');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-sm">
              资料标题
              <Input
                className="mt-2"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <UnitSelect value={module} onChange={setModule} />
            <label className="block text-sm">
              文件（最大 100 MB）
              <input
                className="mt-2 block max-w-full"
                type="file"
                disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {busy && <p role="status">正在上传并验证：{progress}%</p>}
            {notice && (
              <p role="status" className="text-brand-blue">
                {notice}
              </p>
            )}
            <Button type="submit" disabled={busy || !file}>
              发布资料
            </Button>
          </form>
          <div className="mt-7 border-t pt-4">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await api<{ removed: number }>(
                    '/uploads/cleanup',
                    'POST',
                  );
                  setNotice(
                    `已清理 ${r.removed} 份超过 24 小时未完成的上传，不影响已提交作业。`,
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : '清理失败。');
                }
              }}
            >
              清理过期未完成上传
            </Button>
          </div>
        </CardContent>
      </Card>
      <MaterialManager revision={revision} />
    </>
  );
}

function FeedbackAdmin() {
  const [error, setError] = useState('');
  return (
    <>
      <ErrorNotice message={error} />
      <SubmissionOverview
        renderFeedback={(file, onSaved) => (
          <FeedbackRow file={file} report={setError} onSaved={onSaved} />
        )}
      />
    </>
  );
}
function FeedbackRow({
  file,
  report,
  onSaved,
}: {
  file: CourseFile;
  report: (s: string) => void;
  onSaved: (grade: number | null, feedback: string) => void;
}) {
  const [grade, setGrade] = useState(
      file.grade === null ? '' : String(file.grade),
    ),
    [feedback, setFeedback] = useState(file.feedback),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    setGrade(file.grade === null ? '' : String(file.grade));
    setFeedback(file.feedback);
  }, [file.grade, file.feedback]);
  return (
    <Card>
      <CardContent>
        <p className="font-semibold">
          {file.name} · {file.title}
        </p>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          {date(file.completed_at)}
        </p>
        <Download file={file} />
        <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
          <label className="text-sm">
            成绩（0–100）
            <Input
              type="number"
              min={0}
              max={100}
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label className="text-sm">
            反馈
            <Textarea
              maxLength={3000}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                setSaved(false);
              }}
            />
          </label>
        </div>
        <Button
          className="mt-3"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/admin/feedback/${file.id}`, 'POST', {
                grade: grade === '' ? null : Number(grade),
                feedback,
              });
              setSaved(true);
              onSaved(grade === '' ? null : Number(grade), feedback);
            } catch (e) {
              report(e instanceof Error ? e.message : '保存失败。');
            } finally {
              setBusy(false);
            }
          }}
        >
          {saved ? '已保存' : '保存反馈'}
        </Button>
      </CardContent>
    </Card>
  );
}
