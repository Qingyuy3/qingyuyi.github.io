'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, File, UploadCloud, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { assignmentTasks } from '@/data/course';

export function AssignmentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState(assignmentTasks[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const task = assignmentTasks.find((item) => item.id === selectedId) ?? assignmentTasks[0];

  function chooseTask(id: string) {
    setSelectedId(id);
    setFile(null);
    setSubmitted(false);
    setError('');
  }

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (nextFile.size > 20 * 1024 * 1024) { setError('文件超过 20 MB，请压缩后再试。'); return; }
    setError(''); setFile(nextFile); setSubmitted(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {assignmentTasks.map((item) => (
          <button key={item.id} type="button" onClick={() => chooseTask(item.id)} className={`rounded-xl border p-3 text-left transition ${selectedId === item.id ? 'border-primary bg-primary/[0.04] shadow-sm' : 'bg-card hover:border-primary/30'}`}>
            <p className="text-[11px] text-muted-foreground">第 {item.module} 单元</p>
            <p className="mt-1 text-sm font-semibold">{item.title}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>作业 · {task.title}</CardTitle><CardDescription className="mt-1">{task.stage} · 第 {task.module} 单元配套实践</CardDescription></div>
            <Badge variant={submitted ? 'secondary' : 'outline'}>{submitted ? '已提交' : '待提交'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 rounded-xl bg-secondary/60 p-4 text-sm leading-6 text-muted-foreground">
            <p>{task.description}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs">
              <span>建议提交格式：{task.accepted}</span>
              <a href={task.sourcePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">打开原作业说明<ExternalLink className="size-3" /></a>
            </div>
          </div>
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className="rounded-2xl border-2 border-dashed border-border bg-background px-5 py-9 text-center transition hover:border-primary/40 hover:bg-secondary/30">
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.ipynb,.py,.r,.html" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
            {!file ? (
              <><UploadCloud className="mx-auto size-9 text-primary" /><p className="mt-3 text-sm font-medium">将文件拖到这里，或选择文件</p><p className="mt-1 text-xs text-muted-foreground">支持课程常用格式，最大 20 MB</p><Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>选择文件</Button></>
            ) : (
              <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm"><div className="grid size-10 place-items-center rounded-lg bg-primary/8 text-primary"><File className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><Button variant="ghost" size="icon-sm" aria-label="移除文件" onClick={() => { setFile(null); setSubmitted(false); }}><X /></Button></div>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {submitted && <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><div><strong>提交成功</strong><p className="mt-1 text-emerald-800/75">可在作业列表中查看当前提交状态。</p></div></div>}
          <div className="mt-5 flex justify-end"><Button disabled={!file || submitted} onClick={() => setSubmitted(true)}>{submitted ? '已提交' : '确认提交'}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
