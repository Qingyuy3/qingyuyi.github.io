'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ViewKey } from '@/components/course-views';
import { api } from './api-client';
import { date, type Assignment, type CourseFile } from './file-client';
import { useLearning } from './session';
import { studentTodos } from './todo-model';

type Navigate = (view: ViewKey, target?: string) => void;
type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  hidden: number;
  created_at: number;
};
type Notice = {
  id: number;
  title: string;
  destination: 'home' | 'work' | 'discussion';
  target_id: string;
  read_at: number | null;
  created_at: number;
};
type Notices = {
  items: Notice[];
  unread: number;
  latest: number;
  nextBefore: number | null;
};
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : '暂时无法连接，请稍后重试。';
export function NotificationCenter({ navigate }: { navigate: Navigate }) {
  const [data, setData] = useState<Notices>({
    items: [],
    unread: 0,
    latest: 0,
    nextBefore: null,
  });
  const [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const result = await api<Notices>('/notifications');
      if (version === requestVersion.current) {
        setData(result);
        setError('');
      }
    } catch (e) {
      if (version === requestVersion.current) setError(errorText(e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const poll = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(poll, 60000);
    window.addEventListener('focus', poll);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', poll);
      requestVersion.current++;
    };
  }, [refresh]);
  async function read(item?: Notice) {
    setBusy(true);
    setError('');
    try {
      await api(
        '/notifications/read',
        'POST',
        item ? { id: item.id } : { through: data.latest },
      );
      await refresh();
      if (item) {
        setOpen(false);
        navigate(item.destination, item.target_id);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void refresh();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={
              error
                ? '站内通知，暂时无法更新'
                : `站内通知，${data.unread} 条未读`
            }
          />
        }
      >
        <Bell className="size-4" />
        <span>
          通知
          {data.unread > 0 ? `（${data.unread}）` : error ? ' · 连接异常' : ''}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(380px,calc(100vw-24px))] p-4"
      >
        <PopoverTitle>站内通知</PopoverTitle>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void refresh()}
          >
            刷新
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !data.unread}
            onClick={() => void read()}
          >
            全部标为已读
          </Button>
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {data.items.map((n) => (
            <button
              key={n.id}
              type="button"
              disabled={busy}
              onClick={() => void read(n)}
              className={`block w-full rounded-lg border p-3 text-left ${n.read_at === null ? 'border-brand-blue/30 bg-secondary/50' : 'bg-card'}`}
            >
              <p className="text-sm">
                {n.read_at === null ? '未读 · ' : ''}
                {n.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {date(n.created_at)}
              </p>
            </button>
          ))}
          {!data.items.length && !error && (
            <p className="py-5 text-sm text-muted-foreground">
              暂无通知。新公告、作业反馈和讨论回复会显示在这里。
            </p>
          )}
        </div>
        {data.nextBefore && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const version = ++requestVersion.current;
              try {
                const next = await api<Notices>(
                  `/notifications?before=${data.nextBefore}`,
                );
                if (version === requestVersion.current)
                  setData((current) => ({
                    ...next,
                    items: [
                      ...current.items,
                      ...next.items.filter(
                        (n) => !current.items.some((old) => old.id === n.id),
                      ),
                    ],
                  }));
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            查看更早通知
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function LearningHome({
  navigate,
  focusId = '',
}: {
  navigate: Navigate;
  focusId?: string;
}) {
  const user = useLearning()!.user;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]),
    [assignments, setAssignments] = useState<Assignment[]>([]),
    [files, setFiles] = useState<CourseFile[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    Promise.all([
      api<{ items: Announcement[] }>(
        `/announcements${focusId ? '?focusId=' + encodeURIComponent(focusId) : ''}`,
      ),
      api<{ assignments: Assignment[] }>('/assignments'),
      user.role === 'student'
        ? api<{ files: CourseFile[] }>('/submissions')
        : Promise.resolve({ files: [] }),
    ])
      .then(([a, b, c]) => {
        if (current) {
          setAnnouncements(a.items);
          setAssignments(b.assignments);
          setFiles(c.files);
          setNow(Date.now());
        }
      })
      .catch((e) => {
        if (current) setError(errorText(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [focusId, revision, user.role]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const todo = studentTodos(assignments, files, now);
  function taskList(title: string, items: Assignment[], empty: string) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {title} · {items.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!items.length ? (
            <p className="text-sm text-muted-foreground">{empty}</p>
          ) : (
            items.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p>{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.deadline === null
                      ? '未设置截止时间'
                      : `截止：${date(a.deadline)}`}
                    {a.closed
                      ? ' · 已关闭'
                      : a.deadline !== null && a.deadline < now
                        ? ' · 已截止，补交请联系教师'
                        : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('work', a.id)}
                >
                  查看作业
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">智能商务分析与实践</p>
          <h1 className="mt-2 text-2xl font-semibold text-brand-blue">
            {user.name}，
            {user.role === 'teacher' ? '教学工作台' : '本周学习安排'}
          </h1>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => setRevision((x) => x + 1)}
        >
          刷新
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">正在读取课程安排……</p>
      ) : (
        !error && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>课程公告</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {focusId && !announcements.some((a) => a.id === focusId) && (
                  <p className="text-sm text-muted-foreground">
                    这条公告已撤回或不存在。
                  </p>
                )}
                {!announcements.length && (
                  <p className="text-sm text-muted-foreground">
                    教师尚未发布公告。
                  </p>
                )}
                {announcements.map((a) => (
                  <article
                    key={a.id}
                    className={`rounded-xl border p-4 ${a.id === focusId ? 'border-brand-blue bg-secondary/30' : ''}`}
                  >
                    <h2 className="font-semibold text-brand-blue">
                      {a.pinned ? '置顶 · ' : ''}
                      {a.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(a.created_at)}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap break-words leading-7">
                      {a.body}
                    </p>
                  </article>
                ))}
              </CardContent>
            </Card>
            {user.role === 'student' ? (
              <>
                <p className="text-sm text-muted-foreground">
                  本周待办为未来 7
                  天内到期且尚未提交的作业。已提交作业不重复提醒；自主小测不计入待办或正式成绩。
                </p>
                <div className="grid gap-5 xl:grid-cols-2">
                  {taskList('本周待办', todo.week, '未来 7 天没有待交作业。')}
                  {taskList('逾期未交', todo.overdue, '没有逾期未交作业。')}
                </div>
                {!!todo.later.length && taskList('后续作业', todo.later, '')}
                {!!todo.closed.length &&
                  taskList('已关闭且未交', todo.closed, '')}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p>发布公告、查看提交情况和处理学生反馈。</p>
                  <Button onClick={() => navigate('admin')}>
                    进入教学管理
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}

export function AnnouncementsAdmin() {
  const [items, setItems] = useState<Announcement[]>([]),
    [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [pinned, setPinned] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setItems(
      (await api<{ items: Announcement[] }>('/admin/announcements')).items,
    );
  }
  useEffect(() => {
    void refresh().catch((e) => setError(errorText(e)));
  }, []);
  async function update(
    a: Announcement,
    changes: { hidden?: number; pinned?: number },
  ) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/admin/announcements/${a.id}`, 'PATCH', {
        hidden: !!(changes.hidden ?? a.hidden),
        pinned: !!(changes.pinned ?? a.pinned),
      });
      await refresh();
      setNotice('公告状态已更新。');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">课程公告</h2>
      <p className="text-sm text-muted-foreground">
        发布后，当前其他正常账号会收到站内通知。撤回后学生不可见；恢复和置顶不会重复发送通知。
      </p>
      <form
        className="space-y-4 rounded-xl border p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          setNotice('');
          try {
            await api('/admin/announcements', 'POST', {
              title,
              body: content,
              pinned,
            });
            setTitle('');
            setContent('');
            setPinned(false);
            setNotice('公告已发布。');
            await refresh();
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm">
          标题
          <Input
            className="mt-2"
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          正文
          <Textarea
            className="mt-2 min-h-32"
            required
            maxLength={5000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={pinned} onCheckedChange={setPinned} />
          置顶公告
        </label>
        <Button
          type="submit"
          disabled={busy || !title.trim() || !content.trim()}
        >
          {busy ? '正在处理……' : '发布公告'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-brand-blue">
          {notice}
        </p>
      )}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => void refresh().catch((e) => setError(errorText(e)))}
      >
        刷新公告列表
      </Button>
      <p className="text-xs text-muted-foreground">
        以下显示最近 100 条；学生主页显示最近 50 条公开公告，置顶优先。
      </p>
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent>
            <p className="font-semibold">
              {a.hidden ? '已撤回 · ' : a.pinned ? '置顶 · ' : ''}
              {a.title}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
              {a.body}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {date(a.created_at)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void update(a, { hidden: a.hidden ? 0 : 1 })}
              >
                {a.hidden ? '恢复公告' : '撤回公告'}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void update(a, { pinned: a.pinned ? 0 : 1 })}
              >
                {a.pinned ? '取消置顶' : '置顶'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
