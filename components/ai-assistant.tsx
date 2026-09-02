'use client';

import { useState } from 'react';
import { ArrowRight, FileText, LibraryBig, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Material } from '@/data/course';
import { searchMaterials } from '@/lib/course-search';

const suggestions = ['第一章的课程资料', 'Python 基础课件', 'Pandas 透视表练习', '网络爬虫作业'];

type AIAssistantProps = {
  compact?: boolean;
  onOpenMaterial?: (material: Material) => void;
};

export function AIAssistant({ compact = false, onOpenMaterial }: AIAssistantProps) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<Material[]>([]);

  function runSearch(nextQuery: string) {
    const clean = nextQuery.trim();
    if (!clean) return;
    setQuery(clean);
    setSubmittedQuery(clean);
    setResults(searchMaterials(clean));
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-brand-blue text-white shadow-[0_16px_40px_rgba(35,68,119,0.18)] ${compact ? 'p-5 sm:p-7' : 'p-6 sm:p-8'}`}>
      <div className="relative">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/75"><LibraryBig className="size-5" />课程资料检索</div>
        <h2 className={`${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-semibold tracking-tight`}>快速找到需要的学习资料</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">可按学习单元、主题、文件类型或常见问法检索历年课件、作业、数据与代码。</p>

        <form onSubmit={(event) => { event.preventDefault(); runSearch(query); }} className="mt-5 flex gap-2 rounded-2xl bg-white p-2 shadow-lg">
          <Search className="ml-2 mt-2.5 size-5 shrink-0 text-stone-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：有关于网络爬虫的学习资料吗？" aria-label="检索课程资料" className="h-10 border-0 bg-transparent text-slate-900 shadow-none focus-visible:ring-0" />
          <Button type="submit" size="icon-lg" className="rounded-xl bg-white text-brand-blue hover:bg-white/90" aria-label="开始检索"><ArrowRight /></Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => runSearch(suggestion)} className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/15" type="button">{suggestion}</button>
          ))}
        </div>

        {submittedQuery && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-slate-900 shadow-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Search className="size-4 text-white/80" />“{submittedQuery}”的检索结果</div>
              <Badge variant="secondary">{results.length} 个结果</Badge>
            </div>
            {results.length ? (
              <div className={`grid gap-3 ${compact ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
                {results.slice(0, compact ? 3 : 5).map((material) => (
                  <button key={material.id} onClick={() => onOpenMaterial?.(material)} className="group rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-brand-blue/40 hover:bg-white hover:shadow-sm" type="button">
                    <div className="mb-2 flex items-start justify-between gap-2"><FileText className="size-5 text-brand-blue" /><span className="text-[11px] text-slate-500">{material.format}</span></div>
                    <p className="text-sm font-semibold group-hover:text-brand-blue">{material.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">第 {material.chapter} 章 · {material.summary}</p>
                  </button>
                ))}
              </div>
            ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">暂时没有匹配资料。可以换成章节、周次或主题关键词再试一次。</p>}
            <p className="mt-4 text-[11px] text-slate-400">检索范围：历年课程目录 · 结果可直接打开原始文件</p>
          </div>
        )}
      </div>
    </div>
  );
}
