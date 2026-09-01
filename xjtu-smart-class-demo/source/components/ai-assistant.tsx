'use client';

import { useState } from 'react';
import { Bot, FileText, Search, Send, Sparkles } from 'lucide-react';

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
    <div className={`relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#54101d_0%,#842236_58%,#aa3c4f_100%)] text-white shadow-[0_20px_52px_rgba(91,20,33,0.2)] ${compact ? 'p-5 sm:p-7' : 'p-6 sm:p-9'}`}>
      <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[48px] border-white/5" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/75"><Bot className="size-5" />课程 AI 资料助手</div>
        <h2 className={`${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-semibold tracking-tight`}>用一句话找到需要的学习资料</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">支持章节、周次、主题和资料类型。本 Demo 使用本地课程目录进行智能匹配，不会上传你的问题。</p>

        <form onSubmit={(event) => { event.preventDefault(); runSearch(query); }} className="mt-5 flex gap-2 rounded-2xl bg-white p-2 shadow-lg">
          <Search className="ml-2 mt-2.5 size-5 shrink-0 text-stone-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：有关于网络爬虫的学习资料吗？" aria-label="向课程 AI 资料助手提问" className="h-10 border-0 bg-transparent text-stone-900 shadow-none focus-visible:ring-0" />
          <Button type="submit" size="icon-lg" className="rounded-xl bg-[#7d1c2e] hover:bg-[#601522]" aria-label="发送问题"><Send /></Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => runSearch(suggestion)} className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/15" type="button">{suggestion}</button>
          ))}
        </div>

        {submittedQuery && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-stone-900 shadow-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-[#8a2235]" />关于“{submittedQuery}”</div>
              <Badge variant="secondary">{results.length} 个结果</Badge>
            </div>
            {results.length ? (
              <div className={`grid gap-3 ${compact ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
                {results.slice(0, compact ? 3 : 5).map((material) => (
                  <button key={material.id} onClick={() => onOpenMaterial?.(material)} className="group rounded-xl border border-stone-200 bg-stone-50/70 p-3 text-left transition hover:border-[#8a2235]/40 hover:bg-white hover:shadow-sm" type="button">
                    <div className="mb-2 flex items-start justify-between gap-2"><FileText className="size-5 text-[#8a2235]" /><span className="text-[11px] text-stone-500">{material.format}</span></div>
                    <p className="text-sm font-semibold group-hover:text-[#7d1c2e]">{material.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">第 {material.chapter} 章 · {material.summary}</p>
                  </button>
                ))}
              </div>
            ) : <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">暂时没有匹配资料。可以换成章节、周次或主题关键词再试一次。</p>}
            <p className="mt-4 text-[11px] text-stone-400">基于历年课程目录匹配 · 可直接打开已归档文件</p>
          </div>
        )}
      </div>
    </div>
  );
}
