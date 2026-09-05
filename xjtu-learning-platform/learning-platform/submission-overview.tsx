'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { api } from './api-client';
import { date, type CourseFile } from './file-client';
import {
  downloadBatches,
  recordsCsv,
  safeFilename,
  statusLabel,
  submissionRows,
  type Overview,
} from './submission-model';

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function SubmissionOverview({
  renderFeedback,
}: {
  renderFeedback: (
    file: CourseFile,
    saved: (grade: number | null, feedback: string) => void,
  ) => ReactNode;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [assignment, setAssignment] = useState(''),
    [className, setClassName] = useState('all');
  const [status, setStatus] = useState('all'),
    [includeDisabled, setIncludeDisabled] = useState(false);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState(false),
    [progress, setProgress] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api<Overview>(
      `/admin/submission-overview${assignment ? '?assignmentId=' + encodeURIComponent(assignment) : ''}`,
    )
      .then((result) => {
        if (current) setData(result);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [assignment, revision]);
  const allRows = data ? submissionRows(data) : [];
  const classes = [...new Set(allRows.map((r) => r.user.className))].sort(
    (a, b) => a.localeCompare(b, 'zh-CN'),
  );
  const roster = allRows.filter(
    (r) =>
      (includeDisabled || !r.user.disabled) &&
      (className === 'all' || r.user.className === className),
  );
  const rows = roster.filter(
    (r) =>
      status === 'all' ||
      (status === 'submitted' ? !!r.latest : r.status === status),
  );
  const selectedAssignment = data?.assignments.find(
    (a) => a.id === data.assignmentId,
  );
  const files = rows.flatMap((r) => (r.latest ? [r.latest] : []));
  const batches = downloadBatches(files);
  const locked = loading || downloading;
  async function download(batch: CourseFile[], index: number) {
    setDownloading(true);
    setError('');
    setProgress('正在准备下载包……');
    try {
      const { downloadZip } = await import('client-zip');
      async function* inputs() {
        let count = 0;
        for (const file of batch) {
          const student = data?.users.find((u) => u.id === file.owner_id);
          setProgress(
            `正在下载 ${++count}/${batch.length}：${student?.name || file.name}`,
          );
          const response = await fetch(
            `/api/files/${encodeURIComponent(file.id)}`,
            { credentials: 'same-origin', signal: AbortSignal.timeout(180000) },
          );
          if (
            !response.ok ||
            !response.headers.get('Content-Disposition')?.includes('attachment')
          )
            throw new Error(
              '部分文件无法下载，可能是登录已过期。请刷新后重试；本次不生成不完整的下载包。',
            );
          yield {
            name: `${safeFilename(student?.username || file.owner_id)}_${safeFilename(file.name)}/${safeFilename(file.filename)}`,
            input: response,
            lastModified: new Date(file.completed_at),
          };
        }
      }
      const blob = await downloadZip(inputs()).blob();
      saveBlob(
        blob,
        `${safeFilename(selectedAssignment?.title || '作业')}_第${index + 1}包.zip`,
      );
      setProgress(
        `第 ${index + 1} 包已交给浏览器下载，包含 ${batch.length} 份最新作业。`,
      );
    } catch (e) {
      setError(
        e instanceof Error &&
          !['TimeoutError', 'AbortError', 'TypeError'].includes(e.name)
          ? e.message
          : '下载中断或网络超时，请检查网络后重试此下载包。',
      );
      setProgress('');
    } finally {
      setDownloading(false);
    }
  }
  function exportRecords() {
    const csv = recordsCsv([
      [
        '账号',
        '姓名',
        '班级',
        '账号状态',
        '作业',
        '提交状态',
        '版本数',
        '最新文件',
        '提交时间',
        '成绩',
        '反馈',
      ],
      ...rows.map((r) => [
        r.user.username,
        r.user.name,
        r.user.className,
        r.user.disabled ? '已停用' : '正常',
        selectedAssignment?.title,
        statusLabel[r.status],
        r.versions.length,
        r.latest?.filename,
        r.latest ? date(r.latest.completed_at) : '',
        r.latest?.grade,
        r.latest?.feedback,
      ]),
    ]);
    saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `${safeFilename(selectedAssignment?.title || '作业')}_提交总览.csv`,
    );
  }
  const selectClass = 'mt-1 block h-10 w-full rounded-lg border bg-card px-3';
  return (
    <section className="space-y-4" aria-busy={loading}>
      <div>
        <h2 className="text-xl font-semibold text-brand-blue">作业提交总览</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          按每位学生的最新提交统计；填写成绩或反馈后记为已批改。历史版本仍可查看。默认不统计停用账号。
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          作业
          <select
            className={selectClass}
            disabled={locked}
            value={data?.assignmentId || ''}
            onChange={(e) => setAssignment(e.target.value)}
          >
            {!data?.assignments.length && <option value="">暂无作业</option>}
            {data?.assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          班级
          <select
            className={selectClass}
            disabled={locked}
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            <option value="all">全部班级</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c || '未分班'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          提交状态
          <select
            className={selectClass}
            disabled={locked}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">全部学生</option>
            <option value="submitted">已交</option>
            <option value="missing">未交</option>
            <option value="pending">待批改</option>
            <option value="graded">已批改</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeDisabled}
          disabled={locked}
          onChange={(e) => setIncludeDisabled(e.target.checked)}
        />
        包含停用账号
      </label>
      {loading ? (
        <p role="status">正在加载提交记录……</p>
      ) : data?.assignmentId ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['应交人数', roster.length],
              ['已交', roster.filter((r) => r.latest).length],
              ['未交', roster.filter((r) => !r.latest).length],
              ['待批改', roster.filter((r) => r.status === 'pending').length],
            ].map(([label, count]) => (
              <div
                key={label}
                className="rounded-xl border bg-secondary/30 p-4"
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-brand-blue">
                  {count}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            截止时间：{date(selectedAssignment?.deadline ?? null)} ·{' '}
            {selectedAssignment?.closed ? '已关闭提交' : '按截止时间开放提交'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={locked || !rows.length}
              onClick={exportRecords}
            >
              导出当前名单与成绩（CSV）
            </Button>
            {batches.map((batch, i) => (
              <Button
                key={i}
                variant="outline"
                disabled={locked}
                onClick={() => void download(batch, i)}
              >
                下载{batches.length > 1 ? `第 ${i + 1} 包` : '最新作业 ZIP'}（
                {batch.length} 份 ·{' '}
                {(batch.reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)}{' '}
                MB）
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            下载和导出均遵循当前筛选条件。每包文件总量不超过 100
            MB；较大班级分包下载。请勿公开分享学生名单或作业。
          </p>
          {progress && (
            <p role="status" className="text-sm text-brand-blue">
              {progress}
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40">
                <tr>
                  {['账号 / 姓名', '班级', '状态', '最新提交', '成绩'].map(
                    (h) => (
                      <th scope="col" className="p-3" key={h}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user.id} className="border-t">
                    <td className="p-3">
                      {r.user.username} · {r.user.name}
                      {r.user.disabled && '（已停用）'}
                    </td>
                    <td className="p-3">{r.user.className || '未分班'}</td>
                    <td className="p-3">{statusLabel[r.status]}</td>
                    <td className="p-3">
                      {r.latest ? (
                        <a
                          className="text-brand-blue underline"
                          href={`#submission-${r.user.id}`}
                          onClick={() => {
                            const detail = document.getElementById(
                              `submission-${r.user.id}`,
                            );
                            if (detail instanceof HTMLDetailsElement)
                              detail.open = true;
                          }}
                        >
                          {date(r.latest.completed_at)} · {r.versions.length}{' '}
                          个版本
                        </a>
                      ) : (
                        '尚未提交'
                      )}
                    </td>
                    <td className="p-3">{r.latest?.grade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="p-5 text-sm text-muted-foreground">
                当前筛选条件下没有学生。
              </p>
            )}
          </div>
          {rows
            .filter((r) => r.latest)
            .map((r) => (
              <details
                key={r.user.id}
                id={`submission-${r.user.id}`}
                className="rounded-xl border p-4"
              >
                <summary className="cursor-pointer font-medium">
                  {r.user.username} · {r.user.name} · 查看与批改（
                  {r.versions.length} 个版本）
                </summary>
                <div className="mt-4 space-y-4">
                  {r.versions.map((file, i) => (
                    <div key={file.id}>
                      <p className="mb-2 text-sm text-muted-foreground">
                        {i === 0
                          ? '最新提交（计入总览）'
                          : '历史版本（不计入当前状态）'}
                      </p>
                      {renderFeedback(file, (grade, feedback) =>
                        setData((current) =>
                          current
                            ? {
                                ...current,
                                files: current.files.map((f) =>
                                  f.id === file.id
                                    ? { ...f, grade, feedback }
                                    : f,
                                ),
                              }
                            : current,
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
        </>
      ) : (
        <p>尚未发布作业，请先在“作业管理”中发布。</p>
      )}
      <Button
        variant="outline"
        disabled={locked}
        onClick={() => setRevision((r) => r + 1)}
      >
        刷新记录
      </Button>
    </section>
  );
}
