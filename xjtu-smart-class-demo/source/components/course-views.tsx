'use client';

import { useState } from 'react';
import {
  ArrowRight, Award, BarChart3, BookMarked, BookOpen, CalendarDays, Check,
  ChevronDown, ChevronRight, Clock, FileSpreadsheet, FileText, Filter,
  FolderOpen, MapPin, MessageCircle, MoreHorizontal, PlayCircle, Search,
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

const materialIcons = { PDF: FileText, XLSX: FileSpreadsheet, CSV: FileSpreadsheet, MP4: PlayCircle };

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>;
}

function MaterialPreview({ material, onClose }: { material: Material; onClose: () => void }) {
  return (
    <Card className="mb-6 border-primary/25 bg-primary/[0.025]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4"><div><Badge variant="secondary">演示预览</Badge><CardTitle className="mt-3">{material.title}</CardTitle><CardDescription className="mt-1">第 {material.chapter} 章 · {material.type} · {material.format} · {material.size}</CardDescription></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭预览">×</Button></div>
      </CardHeader>
      <CardContent><p className="text-sm leading-6 text-muted-foreground">{material.summary}</p><div className="mt-4 rounded-xl border border-dashed bg-card p-5 text-center text-sm text-muted-foreground">这里将显示或下载维护人员放入的真实文件。<br /><code className="mt-2 inline-block rounded bg-secondary px-2 py-1 text-xs">{material.path}</code></div></CardContent>
    </Card>
  );
}

export function OverviewView({ setView }: { setView: (view: ViewKey) => void }) {
  return (
    <>
      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#4f0e1a_0%,#7f2033_58%,#a43a4c_100%)] px-5 py-7 text-white shadow-[0_22px_58px_rgba(91,20,33,0.22)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border-[54px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-40 size-64 rounded-full border-[42px] border-white/5" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2"><Badge className="border-white/15 bg-white/12 text-white">{course.code}</Badge><span className="text-xs text-white/65">{course.term}</span></div>
          <p className="text-sm font-medium text-white/70">{course.school}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">{course.description}</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button className="h-10 bg-white px-4 text-[#6e1829] hover:bg-white/90" onClick={() => setView('home')}>进入学习主页<ArrowRight /></Button><Button variant="outline" className="h-10 border-white/25 bg-white/8 px-4 text-white hover:bg-white/15 hover:text-white" onClick={() => setView('content')}>查看课程内容</Button></div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: UserRound, label: '授课教师', value: course.teacher },
          { icon: CalendarDays, label: '上课时间', value: course.schedule },
          { icon: MapPin, label: '上课地点', value: course.location },
          { icon: Award, label: '课程学分', value: course.credits },
        ].map((item) => <Card key={item.label} className="gap-3 py-4"><CardContent className="flex items-center gap-3 px-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><item.icon className="size-5" /></div><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-sm font-semibold">{item.value}</p></div></CardContent></Card>)}
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <section>
          <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">课程路线</p><h2 className="mt-1 text-xl font-semibold">六周学什么</h2></div><Button variant="ghost" size="sm" onClick={() => setView('content')}>完整目录<ChevronRight /></Button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => <button key={module.week} type="button" onClick={() => setView('content')} className="group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"><div className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-semibold ${module.status === '进行中' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>W{module.week}</div><div className="min-w-0"><p className="text-sm font-semibold group-hover:text-primary">{module.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{module.description}</p></div></button>)}
          </div>
        </section>

        <div className="space-y-5">
          <Card>
            <CardHeader><div className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><Target className="size-5" /></div><CardTitle className="mt-2">学习目标</CardTitle><CardDescription>完成课程后，你将能够：</CardDescription></CardHeader>
            <CardContent className="space-y-3">{courseObjectives.map((objective, index) => <div key={objective} className="flex gap-3 text-sm leading-6"><div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">{index + 1}</div><p className="text-muted-foreground">{objective}</p></div>)}</CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-start justify-between"><div><CardTitle>课程数据</CardTitle><CardDescription className="mt-1">当前 Demo 的内容规模</CardDescription></div><BarChart3 className="size-5 text-primary" /></div></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">6</p><p className="mt-1 text-[11px] text-muted-foreground">学习模块</p></div><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">{materials.length}</p><p className="mt-1 text-[11px] text-muted-foreground">资料条目</p></div><div className="rounded-xl bg-secondary/60 p-3"><p className="text-xl font-semibold">5</p><p className="mt-1 text-[11px] text-muted-foreground">互动题目</p></div></CardContent>
          </Card>
        </div>
      </div>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><BookMarked className="size-5" /></div><div><CardTitle>考核方式</CardTitle><CardDescription className="mt-1">过程学习与最终项目相结合</CardDescription></div></div></CardHeader>
          <CardContent><div className="flex h-3 overflow-hidden rounded-full">{assessments.map((item) => <div key={item.label} className={item.color} style={{ width: `${item.weight}%` }} />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{assessments.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-secondary/45 px-3 py-2.5"><div className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${item.color}`} /><span className="text-sm">{item.label}</span></div><strong className="text-sm">{item.weight}%</strong></div>)}</div></CardContent>
        </Card>
        <Card className="bg-[#292223] text-stone-50 ring-0">
          <CardHeader><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full bg-white/10"><Users className="size-5" /></div><div><CardDescription className="text-stone-400">课程团队</CardDescription><CardTitle>{course.teacher}</CardTitle></div></div></CardHeader>
          <CardContent><p className="text-sm leading-6 text-stone-300">管理科学与数据分析方向。答疑时间为每周四 19:00–20:00，Demo 中的信息可由维护人员替换。</p><Button variant="outline" className="mt-5 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setView('discussion')}>前往课程讨论</Button></CardContent>
        </Card>
      </section>
    </>
  );
}

export function HomeView({ setView }: { setView: (view: ViewKey) => void }) {
  const [preview, setPreview] = useState<Material | null>(null);
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><span>学习主页</span><ChevronRight className="size-4" /><span>第 3 周</span></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">早上好，陈同学</h1><p className="mt-2 text-sm text-muted-foreground">本周进入回归分析模块，先从课程资料和概念小测开始。</p></div><Badge variant="secondary" className="h-7 rounded-full px-3 text-xs">课程进度 38%</Badge></div>
      {preview && <MaterialPreview material={preview} onClose={() => setPreview(null)} />}
      <AIAssistant compact onOpenMaterial={setPreview} />

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <section><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">本周学习</p><h2 className="mt-1 text-lg font-semibold">第 3 周 · 回归分析入门</h2></div><Button variant="ghost" size="sm" onClick={() => setView('content')}>查看全部<ChevronRight /></Button></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileText, label: '学习资料', title: '回归分析导论', meta: '课件 · 32 页', color: 'bg-amber-50 text-amber-700', view: 'materials' as ViewKey },
                { icon: Check, label: '互动小测', title: '核心概念检查', meta: '5 题 · 约 6 分钟', color: 'bg-emerald-50 text-emerald-700', view: 'work' as ViewKey },
                { icon: UploadCloud, label: '提交作业', title: '案例分析报告', meta: '9 月 8 日截止', color: 'bg-blue-50 text-blue-700', view: 'work' as ViewKey },
              ].map((item) => <Card key={item.title} onClick={() => setView(item.view)} className="cursor-pointer gap-3 py-4 transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="gap-3 px-4"><div className={`grid size-9 place-items-center rounded-xl ${item.color}`}><item.icon className="size-[18px]" /></div><CardDescription className="text-xs">{item.label}</CardDescription><CardTitle className="text-sm">{item.title}</CardTitle></CardHeader><CardContent className="px-4 text-xs text-muted-foreground">{item.meta}</CardContent></Card>)}
            </div>
          </section>
          <Card><CardHeader><CardTitle>最新公告</CardTitle></CardHeader><CardContent className="space-y-4">{announcements.map((item) => <div key={item.title} className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><div className="min-w-16 text-xs text-muted-foreground">{item.date}</div><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p></div></div>)}</CardContent></Card>
        </div>
        <aside className="space-y-4">
          <Card><CardHeader><CardTitle>近期安排</CardTitle><CardDescription>需要优先完成的学习事项</CardDescription></CardHeader><CardContent className="space-y-4">{[['05', '完成概念小测', '23:59 前 · 可尝试 2 次'], ['08', '提交案例分析报告', 'PDF / DOCX · 不超过 20 MB']].map(([day, title, meta], index) => <div key={day} className={`flex gap-3 ${index ? 'border-t border-border pt-4' : ''}`}><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-center"><span className="text-[10px] text-muted-foreground">9月</span><strong className="-mt-1 text-base">{day}</strong></div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{meta}</p></div></div>)}</CardContent></Card>
          <Card className="border-dashed bg-secondary/35"><CardHeader><CardTitle className="text-sm">关于这个 Demo</CardTitle><CardDescription className="leading-6">所有课程、成绩与资料均为演示内容。后续维护人员可以按照中文指南替换。</CardDescription></CardHeader><CardContent><Button variant="outline" size="sm" onClick={() => setView('guide')}>查看维护指南</Button></CardContent></Card>
        </aside>
      </div>
    </>
  );
}

export function ContentView() {
  const [openWeek, setOpenWeek] = useState(3);
  return <><PageHeading eyebrow="课程内容" title="六周学习路径" description="课程按周次和章节组织。维护人员可以在数据文件中添加、删除或调整模块顺序。" /><div className="space-y-3">{modules.map((module) => <Card key={module.week} className={module.week === 3 ? 'border-primary/25' : ''}><button type="button" onClick={() => setOpenWeek(openWeek === module.week ? 0 : module.week)} className="flex w-full items-start gap-4 px-4 text-left sm:px-5"><div className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ${module.status === '已完成' ? 'bg-emerald-50 text-emerald-700' : module.status === '进行中' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>W{module.week}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">第 {module.chapter} 章 · {module.title}</h2><Badge variant={module.status === '进行中' ? 'default' : 'secondary'}>{module.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{module.description}</p></div><ChevronDown className={`mt-3 size-5 text-muted-foreground transition ${openWeek === module.week ? 'rotate-180' : ''}`} /></button>{openWeek === module.week && <CardContent className="ml-0 mt-4 border-t pt-4 sm:ml-15"><div className="grid gap-2 sm:grid-cols-2">{module.items.map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm"><div className="grid size-7 place-items-center rounded-lg bg-card text-xs font-semibold shadow-sm">{index + 1}</div>{item}</div>)}</div></CardContent>}</Card>)}</div></>;
}

export function MaterialsView() {
  const [type, setType] = useState<'全部' | MaterialType>('全部');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Material | null>(null);
  const filtered = materials.filter((material) => (type === '全部' || material.type === type) && `${material.title}${material.summary}${material.keywords.join('')}`.toLowerCase().includes(text.toLowerCase()));
  return <><PageHeading eyebrow="资料中心" title="课程资料与 AI 检索" description="所有示例条目都对应一个明确的文件路径。替换文件或编辑登记信息后，搜索结果会同步更新。" />{preview && <MaterialPreview material={preview} onClose={() => setPreview(null)} />}<AIAssistant onOpenMaterial={setPreview} />
    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={text} onChange={(event) => setText(event.target.value)} placeholder="搜索标题或关键词" className="pl-9" /></div><div className="flex flex-wrap gap-2">{(['全部', '课件', '阅读', '练习', '案例', '视频'] as const).map((item) => <Button key={item} size="sm" variant={type === item ? 'default' : 'outline'} onClick={() => setType(item)}>{item}</Button>)}</div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{filtered.map((material) => { const Icon = materialIcons[material.format as keyof typeof materialIcons] || FileText; return <Card key={material.id} className="gap-3 py-4"><CardHeader className="px-4"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></div><div className="min-w-0 flex-1"><CardTitle className="text-sm">{material.title}</CardTitle><CardDescription className="mt-1">第 {material.chapter} 章 · {material.type} · {material.format} · {material.size}</CardDescription></div></div></CardHeader><CardContent className="px-4"><p className="text-xs leading-5 text-muted-foreground">{material.summary}</p><div className="mt-3 flex items-center justify-between"><code className="max-w-[65%] truncate text-[10px] text-muted-foreground">{material.path}</code><Button variant="outline" size="sm" onClick={() => setPreview(material)}>查看资料</Button></div></CardContent></Card>; })}</div>{!filtered.length && <div className="mt-5 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground"><Filter className="mx-auto mb-3 size-6" />没有符合当前筛选条件的资料。</div>}</>;
}

export function WorkView() {
  return <><PageHeading eyebrow="作业与小测" title="在线互动学习" description="小测可以即时评分并解释概念；作业上传区用于演示完整提交流程，不会把文件传到真实服务器。" /><Tabs defaultValue="quiz"><TabsList className="mb-5 h-10"><TabsTrigger value="quiz" className="px-5">互动小测</TabsTrigger><TabsTrigger value="assignment" className="px-5">作业上传</TabsTrigger></TabsList><TabsContent value="quiz"><InteractiveQuiz /></TabsContent><TabsContent value="assignment"><AssignmentUpload /></TabsContent></Tabs></>;
}

export function DiscussionView() {
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState([{ name: '王同学', time: '昨天 18:42', body: 'R² 很高是否就代表模型一定适合做业务决策？', replies: 3 }, { name: '赵同学', time: '8 月 30 日', body: '我整理了第三章中几个容易混淆的概念：相关、预测和因果。', replies: 5 }]);
  function submit() { if (!draft.trim()) return; setPosts([{ name: '陈同学', time: '刚刚', body: draft.trim(), replies: 0 }, ...posts]); setDraft(''); }
  return <><PageHeading eyebrow="课程讨论" title="向同学和老师提问" description="这个讨论区是前端互动演示，新内容只保留到本次页面刷新前。" /><Card className="mb-5"><CardContent><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="分享一个问题、发现或学习心得……" className="min-h-24" /><div className="mt-3 flex justify-end"><Button onClick={submit} disabled={!draft.trim()}><Send />发布讨论</Button></div></CardContent></Card><div className="space-y-3">{posts.map((post, index) => <Card key={`${post.name}-${index}`}><CardContent><div className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">{post.name[0]}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{post.name} <span className="ml-2 text-xs font-normal text-muted-foreground">{post.time}</span></p><Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{post.body}</p><button className="mt-3 flex items-center gap-2 text-xs font-medium text-primary"><MessageCircle className="size-4" />{post.replies ? `${post.replies} 条回复` : '回复'}</button></div></div></CardContent></Card>)}</div></>;
}

export function CalendarView() {
  const events = [{ day: '05', weekday: '周六', title: '回归分析概念小测', type: '小测', time: '23:59 截止' }, { day: '08', weekday: '周二', title: '门店销售预测案例', type: '作业', time: '23:59 截止' }, { day: '10', weekday: '周四', title: '第 4 周在线答疑', type: '活动', time: '19:00–20:00' }, { day: '12', weekday: '周六', title: '多元回归练习', type: '练习', time: '23:59 截止' }];
  return <><PageHeading eyebrow="课程日历" title="2026 年 9 月" description="集中查看本课程的小测、作业、学习活动和截止时间。" /><div className="grid gap-6 lg:grid-cols-[1fr_300px]"><Card><CardHeader><CardTitle>本月安排</CardTitle></CardHeader><CardContent className="space-y-3">{events.map((event) => <div key={event.title} className="flex items-center gap-4 rounded-xl border p-3"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary"><strong className="text-base">{event.day}</strong><span className="-mt-2 text-[10px] text-muted-foreground">{event.weekday}</span></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-medium">{event.title}</p><Badge variant="outline">{event.type}</Badge></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{event.time}</p></div><ChevronRight className="size-4 text-muted-foreground" /></div>)}</CardContent></Card><Card><CardHeader><CardTitle>学习提醒</CardTitle><CardDescription>未来 7 天内有 2 项任务需要完成。</CardDescription></CardHeader><CardContent><div className="rounded-2xl bg-primary px-5 py-6 text-primary-foreground"><CalendarDays className="size-6" /><p className="mt-5 text-3xl font-semibold">7 天</p><p className="mt-1 text-xs text-primary-foreground/70">距离案例报告截止</p></div></CardContent></Card></div></>;
}

export function GuideView() {
  return <><PageHeading eyebrow="维护指南" title="怎样替换课程内容" description="本 Demo 把“文件本身”和“文件登记信息”分开保存，方便非技术维护人员理解每一份资料属于哪一章。" />
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>课程文件放置位置</CardTitle><CardDescription>每一章都有课件、阅读、练习、案例和答案目录。</CardDescription></CardHeader><CardContent><pre className="overflow-x-auto rounded-xl bg-[#251f20] p-4 text-xs leading-6 text-stone-200">{`public/course-materials/course-001/\n├─ chapter-01/\n│  ├─ slides/      课件\n│  ├─ readings/    阅读资料\n│  ├─ exercises/   练习文件\n│  ├─ cases/       案例资料\n│  └─ answers/     参考答案\n├─ chapter-02/\n└─ chapter-03/\n   └─ slides/\n      └─ regression-introduction.pdf`}</pre></CardContent></Card>
      <Card><CardHeader><CardTitle>内容登记位置</CardTitle><CardDescription>网站标题、章节、关键词和路径集中在一个文件中。</CardDescription></CardHeader><CardContent className="space-y-3"><div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-primary" />data/course.ts</div><p className="mt-2 text-xs leading-5 text-muted-foreground">课程名称、章节模块、资料条目、小测题目和公告。</p></div><div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-primary" />docs/内容维护指南.md</div><p className="mt-2 text-xs leading-5 text-muted-foreground">面向维护人员的详细中文步骤与命名规则。</p></div><div className="rounded-xl border p-4"><div className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-primary" />components/</div><p className="mt-2 text-xs leading-5 text-muted-foreground">AI 助手、小测、作业上传和页面视图等功能组件。</p></div></CardContent></Card></div>
    <Card className="mt-5"><CardHeader><CardTitle>添加一份资料的 3 个步骤</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3">{[['1', '放入文件', '把文件放到对应课程和章节目录。'], ['2', '登记资料', '在 data/course.ts 复制一个资料条目并修改信息。'], ['3', '检查搜索', '打开资料中心，用章节或关键词确认 AI 能找到它。']].map(([step, title, body]) => <div key={step} className="rounded-xl bg-secondary/55 p-4"><div className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">{step}</div><p className="mt-4 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p></div>)}</div></CardContent></Card>
  </>;
}

