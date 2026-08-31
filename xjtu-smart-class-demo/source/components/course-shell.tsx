'use client';

import { useState } from 'react';
import {
  Bell, BookOpen, CalendarDays, CircleHelp, ClipboardCheck, FileText,
  Compass, GraduationCap, Home, Menu, MessageCircle, X,
} from 'lucide-react';

import {
  CalendarView, ContentView, DiscussionView, GuideView, HomeView,
  MaterialsView, OverviewView, WorkView, type ViewKey,
} from '@/components/course-views';
import { Button } from '@/components/ui/button';
import { course } from '@/data/course';

const navItems: { key: ViewKey; label: string; icon: typeof Home }[] = [
  { key: 'overview', label: '课程概览', icon: Compass },
  { key: 'home', label: '学习主页', icon: Home },
  { key: 'content', label: '课程内容', icon: BookOpen },
  { key: 'materials', label: '资料中心', icon: FileText },
  { key: 'work', label: '作业与小测', icon: ClipboardCheck },
  { key: 'discussion', label: '讨论区', icon: MessageCircle },
  { key: 'calendar', label: '课程日历', icon: CalendarDays },
];

export function CourseShell() {
  const [view, setView] = useState<ViewKey>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = {
    overview: <OverviewView setView={setView} />, home: <HomeView setView={setView} />, content: <ContentView />,
    materials: <MaterialsView />, work: <WorkView />,
    discussion: <DiscussionView />, calendar: <CalendarView />, guide: <GuideView />,
  }[view];

  function navigate(next: ViewKey) { setView(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1480px] items-center justify-between px-4 sm:px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="打开课程导航">{mobileOpen ? <X /> : <Menu />}</Button>
            <button type="button" onClick={() => navigate('overview')} className="flex items-center gap-3 text-left">
              <div className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold tracking-wider text-primary-foreground shadow-sm">XJTU</div>
              <div className="hidden sm:block"><p className="text-sm font-semibold tracking-tight">西安交通大学管理学院</p><p className="text-xs text-muted-foreground">课程学习空间 · 演示版</p></div>
            </button>
          </div>
          <div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="查看通知"><Bell /></Button><div className="ml-1 hidden items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 sm:flex"><div className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold">陈</div><span className="text-sm font-medium">陈同学</span></div></div>
        </div>
      </header>

      {mobileOpen && <div className="fixed inset-x-0 top-18 z-20 border-b bg-background p-4 shadow-lg lg:hidden"><nav className="grid grid-cols-2 gap-2">{navItems.map((item) => <button key={item.key} type="button" onClick={() => navigate(item.key)} className={`flex items-center gap-2 rounded-xl p-3 text-sm ${view === item.key ? 'bg-primary text-primary-foreground' : 'bg-secondary/55'}`}><item.icon className="size-4" />{item.label}</button>)}<button type="button" onClick={() => navigate('guide')} className="col-span-2 flex items-center gap-2 rounded-xl bg-secondary/55 p-3 text-sm"><CircleHelp className="size-4" />使用与维护指南</button></nav></div>}

      <div className="mx-auto grid max-w-[1480px] grid-cols-1 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="sticky top-18 hidden h-[calc(100vh-72px)] border-r border-border/70 px-4 py-6 lg:block">
          <div className="mb-7 rounded-2xl bg-secondary/70 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><GraduationCap className="size-4" />当前课程</div><p className="font-semibold leading-snug">{course.title}</p><p className="mt-1 text-xs text-muted-foreground">{course.term}</p></div>
          <nav aria-label="课程导航" className="space-y-1">{navItems.map((item) => <button key={item.key} type="button" onClick={() => navigate(item.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${view === item.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><item.icon className="size-[18px]" />{item.label}</button>)}</nav>
          <div className="mt-8 border-t border-border pt-5"><button onClick={() => navigate('guide')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${view === 'guide' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><CircleHelp className="size-[18px]" />使用与维护指南</button></div>
          <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-dashed p-3 text-[11px] leading-5 text-muted-foreground">Demo 内容仅用于展示，不代表真实课程安排或成绩。</div>
        </aside>
        <section className="min-w-0 px-4 py-7 sm:px-5 lg:px-9 lg:py-9"><div className="mx-auto max-w-[1120px]">{content}</div></section>
      </div>
    </main>
  );
}

