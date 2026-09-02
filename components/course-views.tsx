'use client';

import { useState } from 'react';
import {
  ArrowRight, Award, BarChart3, BookMarked, BookOpen, CalendarDays, Check,
  ChevronDown, ChevronRight, Clock, Database, ExternalLink, FileCode2,
  FileSpreadsheet, FileText, Filter, FolderOpen, MapPin, MessageCircle, MoreHorizontal, Search,
  Send, Target, UploadCloud, UserRound, Users,
} from 'lucide-react';

import { AIAssistant } from '@/components/ai-assistant';
import { AssignmentUpload } from '@/components/assignment-upload';
import { InteractiveQuiz } from '@/components/interactive-quiz';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { announcements, assessments, course, courseObjectives, materials, modules, type Material, type MaterialType } from '@/data/course';

export type ViewKey = 'overview' | 'home' | 'content' | 'materials' | 'work' | 'discussion' | 'calendar' | 'guide';

const materialIcons = { PDF: FileText, XLSX: FileSpreadsheet, CSV: Database, IPYNB: FileCode2, PY: FileCode2 };

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7 border-l-4 border-brand-blue pl-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">{eyebrow}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p></div>;
}

function MaterialPreview({ material, onClose }: { material: Material; onClose: () => void }) {
  return (
    <Card className="mb-6 border-primary/25 bg-primary/[0.025]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4"><div><Badge variant="secondary">历年真实资料</Badge><CardTitle className="mt-3">{material.title}</CardTitle><CardDescription className="mt-1">第 {material.chapter} 单元 · {material.type} · {material.format} · {material.size}</CardDescription></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭预览">×</Button></div>
      </CardHeader>
      <CardContent><p className="text-sm leading-6 text-muted-foreground">{material.summary}</p><div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><code className="min-w-0 break-all text-xs text-muted-foreground">{material.path}</code><a href={material.path} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/85">打开资料<ExternalLink className="size-3.5" /></a></div></CardContent>
    </Card>
  );
}

export function OverviewView({ setView }: { setView: (view: ViewKey) => void }) {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-brand-blue px-5 py-7 text-white shadow-[0_18px_46px_rgba(35,68,119,0.2)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgba(255,255,255,0.13),transparent_58%)]" />
          <img src="./xjtu-seal-white.png" alt="" className="absolute right-10 top-1/2 size-52 -translate-y-1/2 object-contain opacity-[0.18] xl:right-16 xl:size-60" />
        </div>
        <div className="relative z-10 max-w-4xl lg:max-w-[64%]">
          <div className="mb-5 flex flex-wrap items-center gap-2"><Badge className="border-white/15 bg-white/12 text-white">{course.code}</Badge><span className="text-xs text-white/65">{course.term}</span></div>
          <p className="text-sm font-medium text-white/70">{course.school}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">{course.description}</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button className="h-10 bg-white px-4 text-brand-blue hover:bg-white/90" onClick={() => setView('home')}>进入学习主页<ArrowRight /></Button><Button variant="outline" className="h-10 border-white/30 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white" onClick={() => setView('content')}>查看课程内容</Button></div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: UserRound, label: '授课教师', value: course.teacher },
          { icon: CalendarDays, label: '学习规模', value: course.schedule },
          { icon: MapPin, label: '资料范围', value: course.location },
          { icon: Award, label: '课程学时', value: course.credits },
        ].map((item) => <Card key={item.label} className="gap-3 py-4"><CardContent className="flex items-center gap-3 px-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><item.icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-sm font-semibold">{item.value}</p></div></CardContent></Card>)}
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <section>
          <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">课程路线</p><h2 className="mt-1 text-xl font-semibold">八个学习单元</h2></div><Button variant="ghost" size="sm" onClick={() => setView('content')}>完整目录<ChevronRight /></Button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => <button key={module.week} type="button" onClick={() => setView('content')} className="group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold text-muted-foreground">U{module.week}</div><div className="min-w-0"><p className="text-sm font-semibold group-hover:text-primary">{module.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{module.description}</p></div></button>)}
          </div>
        </section>

        <div className="space-y-5">
          <Card>
            <CardHeader><div className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><Target className="size-5" /></div><CardTitle className="mt-2">学习目标</CardTitle><CardDescription>完成课程后，你将能够：</CardDescription></CardHeader>
            <CardContent className="space-y-3">{courseObjectives.map((objective, index) => <div key={objective} className="flex gap-3 text-sm leading-6"><div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">{index + 1}</div><p className="text-muted-foreground">{objective}</p></div>)}</CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-start justify-between"><div><CardTitle>课程资源</CardTitle><CardDescription className="mt-1">当前课程空间收录内容</CardDescription></div><BarChart3 className="size-5 text-primary" /></div></CardHeader>
            <CardContent className="grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">8</p><p className="mt-1 text-[11px] text-muted-foreground">学习单元</p></div><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">10</p><p className="mt-1 text-[11px] text-muted-foreground">课件</p></div><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">4</p><p className="mt-1 text-[11px] text-muted-foreground">作业</p></div><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">5</p><p className="mt-1 text-[11px] text-muted-foreground">数据/代码</p></div></CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><BookMarked className="size-5" /></div><div><CardTitle>考核方式</CardTitle><CardDescription className="mt-1">过程学习与最终项目相结合</CardDescription></div></div></CardHeader>
          <CardContent><div className="flex h-3 overflow-hidden rounded-full">{assessments.map((item) => <div key={item.label} className={item.color} style={{ width: `${item.weight}%` }} />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{assessments.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-secondary/45 px-3 py-2.5"><div className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${item.color}`} /><span className="text-sm">{item.label}</span></div><strong className="text-sm">{item.weight}%</strong></div>)}</div></CardContent>
        </Card>
        <Card className="bg-brand-blue text-white ring-0">
          <CardHeader><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full bg-white/10"><Users className="size-5" /></div><div><CardDescription className="text-white/60">授课教师</CardDescription><CardTitle>{course.teacher}</CardTitle></div></div></CardHeader>
          <CardContent><p className="text-sm leading-6 text-white/72">课程资料来自历年相关教学内容，并按照学习单元重新整理。课程安排与任务要求以教师发布的最新通知为准。</p><Button variant="outline" className="mt-5 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setView('discussion')}>前往课程讨论</Button></CardContent>
        </Card>
      </section>
    </>
  );
}

export function HomeView({ setView }: { setView: (view: ViewKey) => void }) {
  const [preview, setPreview] = useState<Material | null>(null);
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><span>学习主页</span><ChevronRight className="size-4" /><span>历年资料学习路线</span></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">早上好，陈同学</h1><p className="mt-2 text-sm text-muted-foreground">建议从第 5 单元开始一次完整实践：先读 Pandas，再打开数据与 Notebook，最后完成透视表作业。</p></div><Badge variant="secondary" className="h-7 rounded-full px-3 text-xs">已收录 19 份资料</Badge></div>
      {preview && <MaterialPreview material={preview} onClose={() => setPreview(null)} />}
      <AIAssistant compact onOpenMaterial={setPreview} />

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <section><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">推荐学习</p><h2 className="mt-1 text-lg font-semibold">第 5 单元 · Pandas 与透视表实践</h2></div><Button variant="ghost" size="sm" onClick={() => setView('content')}>查看全部<ChevronRight /></Button></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileText, label: '学习资料', title: 'Pandas 模块的使用', meta: '课件 · 55 页', color: 'bg-amber-50 text-amber-700', view: 'materials' as ViewKey },
                { icon: Database, label: '数据与代码', title: 'Tips + Titanic', meta: '2 个数据集 · 2 个 Notebook', color: 'bg-emerald-50 text-emerald-700', view: 'materials' as ViewKey },
                { icon: UploadCloud, label: '实践作业', title: '透视表练习', meta: '原题可下载 · 在线提交', color: 'bg-blue-50 text-blue-700', view: 'work' as ViewKey },
              ].map((item) => <Card key={item.title} onClick={() => setView(item.view)} className="cursor-pointer gap-3 py-4 transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="gap-3 px-4"><div className={`grid size-9 place-items-center rounded-xl ${item.color}`}><item.icon className="size-[18px]" /></div><CardDescription className="text-xs">{item.label}</CardDescription><CardTitle className="text-sm">{item.title}</CardTitle></CardHeader><CardContent className="px-4 text-xs text-muted-foreground">{item.meta}</CardContent></Card>)}
            </div>
          </section>
          <Card><CardHeader><CardTitle>最新公告</CardTitle></CardHeader><CardContent className="space-y-4">{announcements.map((item) => <div key={item.title} className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><div className="min-w-16 text-xs text-muted-foreground">{item.date}</div><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p></div></div>)}</CardContent></Card>
        </div>
        <aside className="space-y-4">
          <Card><CardHeader><CardTitle>建议顺序</CardTitle><CardDescription>把课件、数据、代码和作业连起来学习</CardDescription></CardHeader><CardContent className="space-y-4">{[['01', '阅读 Pandas 课件', '理解数据读取、清洗与汇总'], ['02', '运行配套 Notebook', 'Tips / Titanic 透视表'], ['03', '完成原始练习题', '形成分析结果与解释']].map(([day, title, meta], index) => <div key={day} className={`flex gap-3 ${index ? 'border-t border-border pt-4' : ''}`}><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-center"><strong className="text-base">{day}</strong></div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{meta}</p></div></div>)}</CardContent></Card>
          <Card className="border-l-4 border-l-brand-blue bg-secondary/35"><CardHeader><CardTitle className="text-sm">关于课程资料</CardTitle><CardDescription className="leading-6">课程内容依据历年教学材料整理；新学期安排、上课时间与任务截止时间以教师通知为准。</CardDescription></CardHeader><CardContent><Button variant="outline" size="sm" onClick={() => setView('materials')}>浏览全部资料</Button></CardContent></Card>
        </aside>
      </div>
    </>
  );
}

export function ContentView() {
  const [openWeek, setOpenWeek] = useState(5);
  return <><PageHeading eyebrow="课程内容" title="八个学习单元" description="按照历年课件的知识依赖重新排序：先建立 R/Python 基础，再进入数据处理、集成学习与网络爬虫实践。" /><div className="space-y-3">{modules.map((module) => {
    const relatedMaterials = materials.filter((material) => material.chapter === module.chapter);
    return <Card key={module.week}><button type="button" onClick={() => setOpenWeek(openWeek === module.week ? 0 : module.week)} className="flex w-full items-start gap-4 px-4 text-left sm:px-5"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-semibold text-muted-foreground">U{module.week}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">第 {module.chapter} 单元 · {module.title}</h2><Badge variant="secondary">{module.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{module.description}</p></div><ChevronDown className={`mt-3 size-5 text-muted-foreground transition ${openWeek === module.week ? 'rotate-180' : ''}`} /></button>{openWeek === module.week && <CardContent className="ml-0 mt-4 border-t pt-4 sm:ml-15"><div className="grid gap-5 lg:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">学习重点</p><div className="space-y-2">{module.items.map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm"><div className="grid size-7 place-items-center rounded-lg bg-card text-xs font-semibold shadow-sm">{index + 1}</div>{item}</div>)}</div></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">相关课程文件</p><div className="space-y-2">{relatedMaterials.map((material) => <a key={material.id} href={material.path} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-sm transition hover:border-primary/40 hover:bg-secondary/30"><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 font-medium group-hover:text-primary">{material.title}</span><ExternalLink className="size-4 shrink-0 text-muted-foreground" /></a>)}{!relatedMaterials.length && <p className="rounded-xl bg-secondary/50 p-3 text-sm text-muted-foreground">本单元资料待补充。</p>}</div></div></div></CardContent>}</Card>;
  })}</div></>;
}

export function MaterialsView() {
  const [type, setType] = useState<'全部' | MaterialType>('全部');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Material | null>(null);
  const filtered = materials.filter((material) => (type === '全部' || material.type === type) && `${material.title}${material.summary}${material.keywords.join('')}`.toLowerCase().includes(text.toLowerCase()));
  return <><PageHeading eyebrow="资料中心" title="历年课程资料与主题检索" description="19 份材料已按课件、作业、数据和代码分类；每个条目都可打开原文件，并与对应学习单元关联。" />{preview && <MaterialPreview material={preview} onClose={() => setPreview(null)} />}<AIAssistant onOpenMaterial={setPreview} />
    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={text} onChange={(event) => setText(event.target.value)} placeholder="搜索 Python、Pandas、爬虫或作业" className="pl-9" /></div><div className="flex flex-wrap gap-2">{(['全部', '课件', '作业', '数据', '代码'] as const).map((item) => <Button key={item} size="sm" variant={type === item ? 'default' : 'outline'} onClick={() => setType(item)}>{item}</Button>)}</div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{filtered.map((material) => { const Icon = materialIcons[material.format as keyof typeof materialIcons] || FileText; return <Card key={material.id} className="gap-3 py-4"><CardHeader className="px-4"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></div><div className="min-w-0 flex-1"><CardTitle className="text-sm">{material.title}</CardTitle><CardDescription className="mt-1">第 {material.chapter} 单元 · {material.type} · {material.format} · {material.size}</CardDescription></div></div></CardHeader><CardContent className="px-4"><p className="text-xs leading-5 text-muted-foreground">{material.summary}</p><div className="mt-3 flex items-center justify-between"><code className="max-w-[65%] truncate text-[10px] text-muted-foreground">{material.path}</code><Button variant="outline" size="sm" onClick={() => setPreview(material)}>查看资料</Button></div></CardContent></Card>; })}</div>{!filtered.length && <div className="mt-5 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground"><Filter className="mx-auto mb-3 size-6" />没有符合当前筛选条件的资料。</div>}</>;
}

export function WorkView() {
  return <><PageHeading eyebrow="作业与小测" title="课程任务与在线互动" description="从四份课程作业中选择任务，查看题目并提交文件；互动小测覆盖数据处理、集成学习和网络爬虫。" /><Tabs defaultValue="quiz"><TabsList className="mb-5 h-10"><TabsTrigger value="quiz" className="px-5">互动小测</TabsTrigger><TabsTrigger value="assignment" className="px-5">课程作业</TabsTrigger></TabsList><TabsContent value="quiz"><InteractiveQuiz /></TabsContent><TabsContent value="assignment"><AssignmentUpload /></TabsContent></Tabs></>;
}

type DiscussionReply = { id: string; name: string; time: string; body: string };
type DiscussionPost = { id: string; name: string; time: string; body: string; replies: DiscussionReply[] };

const initialDiscussionPosts: DiscussionPost[] = [
  { id: 'p01', name: '王同学', time: '昨天 18:42', body: '静态网页和动态网页应该怎样选择不同的抓取方法？', replies: [{ id: 'r01', name: '李同学', time: '昨天 19:10', body: '可以先查看目标数据是否直接出现在网页源代码中；如果没有，再检查页面使用的接口请求。' }, { id: 'r02', name: '课程助教', time: '昨天 20:05', body: '第 7 单元的 Python 网络爬虫课件对这两种情况都有说明，建议先阅读 HTTP 请求与页面解析部分。' }] },
  { id: 'p02', name: '赵同学', time: '8 月 30 日', body: 'Tips 数据的透视表里，如何同时按性别和是否吸烟分组？', replies: [{ id: 'r03', name: '孙同学', time: '8 月 30 日', body: '可以把 sex 和 smoker 同时放进 index 参数，再选择需要汇总的数值字段。' }] },
];

export function DiscussionView() {
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState<DiscussionPost[]>(initialDiscussionPosts);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  function submit() {
    if (!draft.trim()) return;
    const post: DiscussionPost = { id: `p-${Date.now()}`, name: '陈同学', time: '刚刚', body: draft.trim(), replies: [] };
    setPosts((current) => [post, ...current]);
    setDraft('');
  }

  function submitReply(postId: string) {
    const replyText = replyDrafts[postId]?.trim();
    if (!replyText) return;
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, replies: [...post.replies, { id: `r-${Date.now()}`, name: '陈同学', time: '刚刚', body: replyText }] } : post));
    setReplyDrafts((current) => ({ ...current, [postId]: '' }));
  }

  return <><PageHeading eyebrow="课程讨论" title="向同学和老师提问" description="围绕课程内容分享问题、发现和学习心得，也可以在同学的帖子下继续讨论。" /><Card className="mb-5"><CardContent><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="分享一个问题、发现或学习心得……" className="min-h-24" /><div className="mt-3 flex justify-end"><Button onClick={submit} disabled={!draft.trim()}><Send />发布讨论</Button></div></CardContent></Card><div className="space-y-3">{posts.map((post) => {
    const expanded = openPostId === post.id;
    return <Card key={post.id}><CardContent><div className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">{post.name[0]}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{post.name} <span className="ml-2 text-xs font-normal text-muted-foreground">{post.time}</span></p><Button variant="ghost" size="icon-sm" aria-label="更多讨论操作"><MoreHorizontal /></Button></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{post.body}</p><button type="button" aria-expanded={expanded} onClick={() => setOpenPostId(expanded ? null : post.id)} className="mt-3 flex items-center gap-2 text-xs font-medium text-primary"><MessageCircle className="size-4" />{post.replies.length ? `${post.replies.length} 条回复` : '回复'}<ChevronDown className={`size-3 transition ${expanded ? 'rotate-180' : ''}`} /></button>{expanded && <div className="mt-4 border-l-2 border-primary/25 pl-4"><div className="space-y-3">{post.replies.map((reply) => <div key={reply.id} className="rounded-xl bg-secondary/45 p-3"><p className="text-xs font-medium">{reply.name}<span className="ml-2 font-normal text-muted-foreground">{reply.time}</span></p><p className="mt-1 text-sm leading-6 text-muted-foreground">{reply.body}</p></div>)}{!post.replies.length && <p className="text-xs text-muted-foreground">还没有回复，你可以发出第一条回复。</p>}</div><Textarea value={replyDrafts[post.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder={`回复 ${post.name}……`} className="mt-3 min-h-20" /><div className="mt-2 flex justify-end"><Button size="sm" onClick={() => submitReply(post.id)} disabled={!replyDrafts[post.id]?.trim()}><Send />发布回复</Button></div></div>}</div></div></CardContent></Card>;
  })}</div></>;
}

export function CalendarView() {
  const events = [{ day: 'U3', weekday: '可视化', title: '中文分词与词云练习', type: '作业', time: '完成 R 可视化课件后', materialId: 'm04' }, { day: 'U5', weekday: 'Pandas', title: 'Tips 透视表练习', type: '作业', time: '配套数据与 Notebook 已提供', materialId: 'm09' }, { day: 'U7', weekday: '静态爬虫', title: '豆瓣电影抓取', type: '实验', time: '建议先阅读 Python 爬虫课件', materialId: 'm17' }, { day: 'U8', weekday: '综合项目', title: '商品评论抓取与可视化', type: '大作业', time: '小组形式完成', materialId: 'm19' }];
  return <><PageHeading eyebrow="课程进度" title="历年教学任务地图" description="原教学包没有提供新学期日期，因此按学习单元展示任务位置；正式截止时间以教师通知为准。" /><div className="grid gap-6 lg:grid-cols-[1fr_300px]"><Card><CardHeader><CardTitle>任务节点</CardTitle></CardHeader><CardContent className="space-y-3">{events.map((event) => { const relatedMaterial = materials.find((material) => material.id === event.materialId); return <a key={event.title} href={relatedMaterial?.path} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-secondary/30"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary"><strong className="text-base">{event.day}</strong><span className="-mt-2 text-[10px] text-muted-foreground">{event.weekday}</span></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-medium group-hover:text-primary">{event.title}</p><Badge variant="outline">{event.type}</Badge></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{event.time}</p></div><ExternalLink className="size-4 text-muted-foreground group-hover:text-primary" /></a>; })}</CardContent></Card><Card><CardHeader><CardTitle>考核提醒</CardTitle><CardDescription>历年课件中明确的成绩构成</CardDescription></CardHeader><CardContent><div className="rounded-2xl bg-primary px-5 py-6 text-primary-foreground"><CalendarDays className="size-6" /><p className="mt-5 text-3xl font-semibold">50% + 50%</p><p className="mt-1 text-xs text-primary-foreground/70">程序实验报告 + 小组大作业</p></div></CardContent></Card></div></>;
}

export function GuideView() {
  return <><PageHeading eyebrow="维护指南" title="怎样维护历年课程资料" description="真实文件按学期归档，网站登记信息再把课件、作业、数据和代码连接到对应学习单元。" />
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>课程文件放置位置</CardTitle><CardDescription>保留原始中文分类，新增学期时再建立一个独立文件夹。</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto rounded-xl bg-[#251f20] p-4 text-xs leading-6 text-stone-200">{`public/course-materials/course-001/\n└─ former-semester-2024/\n   ├─ 课件/    10 份 PDF\n   ├─ 作业/     4 份 PDF\n   ├─ 数据/     2 份 CSV\n   └─ 代码/\n      ├─ 2 份 Jupyter Notebook\n      └─ 1 份 Python 示例`}</pre></CardContent></Card>
      <Card><CardHeader><CardTitle>内容登记位置</CardTitle><CardDescription>网站标题、章节、关键词和路径集中在一个文件中。</CardDescription></CardHeader><CardContent className="space-y-3"><div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-primary" />data/course.ts</div><p className="mt-2 text-xs leading-5 text-muted-foreground">课程名称、章节模块、资料条目、小测题目和公告。</p></div><div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-primary" />docs/内容维护指南.md</div><p className="mt-2 text-xs leading-5 text-muted-foreground">面向维护人员的详细中文步骤与命名规则。</p></div><div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-primary" />components/</div><p className="mt-2 text-xs leading-5 text-muted-foreground">资料检索、小测、作业上传和页面视图等功能组件。</p></div></CardContent></Card></div>
    <Card className="mt-5"><CardHeader><CardTitle>添加一份资料的 3 个步骤</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3">{[['1', '按学期归档', '把文件放到对应学期的课件、作业、数据或代码目录。'], ['2', '登记资料', '在 data/course.ts 复制一个资料条目并填写单元、摘要和关键词。'], ['3', '检查链接与搜索', '打开资料中心，确认文件能打开，资料检索也能用常见问法找到它。']].map(([step, title, body]) => <div key={step} className="rounded-xl bg-secondary/55 p-4"><div className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">{step}</div><p className="mt-4 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p></div>)}</div></CardContent></Card>
  </>;
}
