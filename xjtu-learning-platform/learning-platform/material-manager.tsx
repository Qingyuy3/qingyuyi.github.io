'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { api } from './session';
import { date } from './file-client';

type Material = {
  id: string;
  title: string;
  filename: string;
  module: number;
  bytes: number;
  completed_at: number;
  name: string;
  visibility: 'published' | 'hidden' | 'trashed' | 'deleting';
  material_version: number;
};
const statusName = {
  published: '已发布',
  hidden: '已隐藏',
  trashed: '回收站',
  deleting: '删除未完成',
};
type Action = 'hide' | 'publish' | 'trash' | 'restore' | 'purge';

export function MaterialManager({ revision }: { revision: number }) {
  const [files, setFiles] = useState<Material[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [unit, setUnit] = useState('0'),
    [status, setStatus] = useState('active'),
    [query, setQuery] = useState('');
  const [since, setSince] = useState(''),
    [until, setUntil] = useState(''),
    [order, setOrder] = useState('newest');
  const [dialog, setDialog] = useState<{
      file: Material;
      action: 'trash' | 'purge';
    } | null>(null),
    [confirmation, setConfirmation] = useState('');
  async function refresh() {
    setFiles((await api<{ files: Material[] }>('/admin/materials')).files);
  }
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [revision]);
  async function run(
    file: Material,
    action?: Action,
    edits?: { title: string; module: number },
  ) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(
        `/admin/materials/${file.id}${action ? '/' + action : ''}`,
        action ? 'POST' : 'PATCH',
        {
          version: file.material_version,
          ...edits,
          ...(action === 'purge' ? { confirmFilename: confirmation } : {}),
        },
      );
      setNotice(
        action === 'purge'
          ? '文件已彻底删除，无法从回收站恢复。'
          : action === 'restore'
            ? '已恢复为隐藏状态，确认内容后可重新发布。'
            : action === 'trash'
              ? '已移入回收站，学生无法访问。'
              : action === 'hide'
                ? '已隐藏，学生无法查看或下载。'
                : action === 'publish'
                  ? '已发布，学生可以查看和下载。'
                  : '标题和所属单元已保存。',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败，请刷新后重试。');
    } finally {
      setDialog(null);
      setConfirmation('');
      try {
        await refresh();
      } catch {
        setError('列表刷新失败，请点击刷新列表确认操作结果。');
      }
      setBusy(false);
    }
  }
  const visible = files
    .filter(
      (f) =>
        (unit === '0' || f.module === Number(unit)) &&
        (status === 'all' ||
          (status === 'active'
            ? ['published', 'hidden'].includes(f.visibility)
            : status === 'trash'
              ? ['trashed', 'deleting'].includes(f.visibility)
              : f.visibility === status)) &&
        (!since || f.completed_at >= new Date(since + 'T00:00:00').getTime()) &&
        (!until ||
          f.completed_at <= new Date(until + 'T23:59:59.999').getTime()) &&
        (f.title + ' ' + f.filename)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      order === 'newest'
        ? b.completed_at - a.completed_at
        : a.completed_at - b.completed_at,
    );
  const controlClass = 'mt-1 block h-9 rounded-lg border bg-card px-2 text-sm';
  return (
    <Card>
      <CardHeader>
        <CardTitle>已上传资料</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          管理教师上传的本学期资料。回收站可恢复；彻底删除无法撤销。学生已经下载的副本无法收回。
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            搜索
            <Input
              className="mt-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="标题或文件名"
            />
          </label>
          <label className="text-sm">
            学习单元
            <select
              className={controlClass}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="0">全部单元</option>
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i + 1}>
                  第 {i + 1} 单元
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            显示状态
            <select
              className={controlClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">已发布与隐藏</option>
              <option value="published">已发布</option>
              <option value="hidden">已隐藏</option>
              <option value="trash">回收站</option>
              <option value="all">全部状态</option>
            </select>
          </label>
          <label className="text-sm">
            上传起始日期
            <Input
              className="mt-1"
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </label>
          <label className="text-sm">
            上传截止日期
            <Input
              className="mt-1"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <label className="text-sm">
            排序
            <select
              className={controlClass}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="newest">最新上传在前</option>
              <option value="oldest">最早上传在前</option>
            </select>
          </label>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError('');
              void refresh().catch((e) => setError(e.message));
            }}
          >
            刷新列表
          </Button>
        </div>
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-3 text-sm text-brand-blue">
            {notice}
          </p>
        )}
        <p className="mb-3 text-sm">
          {loading
            ? '正在读取资料……'
            : `符合条件 ${visible.length} 份 · 总计 ${files.length} 份`}
        </p>
        <div className="space-y-3">
          {visible.map((file) => (
            <MaterialRow
              key={`${file.id}:${file.material_version}`}
              file={file}
              busy={busy}
              save={(edits) => run(file, undefined, edits)}
              act={(action) => {
                if (action === 'trash' || action === 'purge') {
                  setConfirmation('');
                  setDialog({ file, action });
                } else void run(file, action);
              }}
            />
          ))}
        </div>
        {!loading && !visible.length && (
          <p className="py-5 text-sm text-muted-foreground">
            没有符合筛选条件的资料。
          </p>
        )}
        <AlertDialog
          open={!!dialog}
          onOpenChange={(open) => {
            if (!open && !busy) setDialog(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dialog?.action === 'purge' ? '彻底删除文件？' : '移入回收站？'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dialog?.file.title}
                <br />
                {dialog?.file.filename}
                <br />
                {dialog?.action === 'purge'
                  ? '文件将从存储中移除，无法从回收站恢复。请确认不再需要，或已另行备份。'
                  : '学生将无法查看或下载。教师之后可以从回收站恢复，恢复后默认为隐藏。'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {dialog?.action === 'purge' && (
              <label className="text-sm">
                输入完整文件名确认
                <Input
                  className="mt-2"
                  value={confirmation}
                  disabled={busy}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={
                  busy ||
                  (dialog?.action === 'purge' &&
                    confirmation !== dialog.file.filename)
                }
                onClick={() => {
                  if (dialog) void run(dialog.file, dialog.action);
                }}
              >
                {busy
                  ? '正在处理……'
                  : dialog?.action === 'purge'
                    ? '确认彻底删除'
                    : '确认移入回收站'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function MaterialRow({
  file,
  busy,
  save,
  act,
}: {
  file: Material;
  busy: boolean;
  save: (edits: { title: string; module: number }) => Promise<void>;
  act: (action: Action) => void;
}) {
  const [title, setTitle] = useState(file.title),
    [unit, setUnit] = useState(file.module);
  const editable = ['published', 'hidden'].includes(file.visibility);
  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{file.title}</h3>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {file.filename} · {(file.bytes / 1024 / 1024).toFixed(2)} MB · 第{' '}
            {file.module} 单元
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            上传：{file.name} · {date(file.completed_at)}
          </p>
        </div>
        <span className="rounded bg-secondary px-2 py-1 text-sm">
          {statusName[file.visibility]}
        </span>
      </div>
      {editable && (
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void save({ title, module: unit });
          }}
        >
          <label className="min-w-52 flex-1 text-sm">
            资料标题
            <Input
              className="mt-1"
              required
              maxLength={120}
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="text-sm">
            所属单元
            <select
              className="mt-1 block h-9 rounded-lg border bg-card px-2"
              value={unit}
              disabled={busy}
              onChange={(e) => setUnit(Number(e.target.value))}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i + 1}>
                  第 {i + 1} 单元
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            variant="outline"
            disabled={
              busy ||
              !title.trim() ||
              (title === file.title && unit === file.module)
            }
          >
            保存修改
          </Button>
        </form>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editable && (
          <>
            <a
              href={`/api/files/${file.id}`}
              className="px-2 text-sm text-brand-blue underline"
              download
            >
              下载查看
            </a>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                act(file.visibility === 'published' ? 'hide' : 'publish')
              }
            >
              {file.visibility === 'published' ? '隐藏资料' : '重新发布'}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => act('trash')}
            >
              移入回收站
            </Button>
          </>
        )}
        {file.visibility === 'trashed' && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act('restore')}
          >
            恢复为隐藏
          </Button>
        )}
        {!editable && (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => act('purge')}
          >
            {file.visibility === 'deleting' ? '重试彻底删除' : '彻底删除'}
          </Button>
        )}
      </div>
    </section>
  );
}
