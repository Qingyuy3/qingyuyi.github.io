'use client';

import { useState } from 'react';
import { ExternalLink, FileText, LoaderCircle, MessageSquareText, RotateCcw, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { materials } from '@/data/course';
import type { Material } from '@/data/course';
import { searchMaterials } from '@/lib/course-search';

const suggestions = ['第一章应该先学什么？', '解释一下 Pandas 透视表', '给我网络爬虫作业的提示', '随机森林为什么属于集成学习？'];
const remoteEndpoint = 'https://xjtu-smart-class-demo.yiqingyuteddy.chatgpt.site/api/ta';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Material[];
  fallback?: boolean;
};

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好，我是《智能分析》课程助教。你可以问我课程概念、学习顺序、代码思路或作业提示，我会同时推荐对应的课程文件。',
};

type AIAssistantProps = {
  compact?: boolean;
  onOpenMaterial?: (material: Material) => void;
};

export function AIAssistant({ compact = false, onOpenMaterial }: AIAssistantProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [loading, setLoading] = useState(false);

  function endpoint() {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) return remoteEndpoint;
    return '/api/ta';
  }

  async function ask(nextQuery: string) {
    const clean = nextQuery.trim();
    if (!clean || loading) return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: clean };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
      });
      const result = await response.json() as { answer?: string; sourceIds?: string[]; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || '课程助教暂时无法回答');
      const sources = (result.sourceIds || []).map((id) => materials.find((material) => material.id === id)).filter((material): material is Material => Boolean(material));
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.answer!.replaceAll('**', ''), sources }]);
    } catch {
      const sources = searchMaterials(clean).slice(0, 3);
      const fallbackText = sources.length
        ? '课程助教暂时没有连接成功，但我先根据课程目录找到了几份可能相关的资料。你可以先打开查看，稍后再重新提问。'
        : '课程助教暂时没有连接成功，课程目录中也没有找到明确匹配的资料。可以换成章节、主题或文件类型再问一次。';
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: fallbackText, sources, fallback: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-[0_16px_40px_rgba(35,68,119,0.12)]">
      <div className={`bg-brand-blue text-white ${compact ? 'px-5 py-5 sm:px-7' : 'px-5 py-6 sm:px-7'}`}>
        <div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/75"><MessageSquareText className="size-5" />课程助教</div><h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold tracking-tight`}>有问题，直接问</h2><p className="mt-1 text-sm leading-6 text-white/72">概念解释、学习建议、代码思路和作业提示，回答会关联课程资料。</p></div><Button type="button" size="icon-sm" variant="ghost" onClick={() => { setMessages([welcomeMessage]); setQuery(''); }} className="text-white/70 hover:bg-white/10 hover:text-white" aria-label="重新开始对话"><RotateCcw /></Button></div>
      </div>

      <div className={`space-y-4 overflow-y-auto bg-secondary/20 p-4 sm:p-5 ${compact ? 'max-h-[390px]' : 'max-h-[520px]'}`} aria-live="polite">
        {messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border bg-card text-foreground shadow-sm'}`}><p className="whitespace-pre-wrap">{message.content}</p>{message.sources?.length ? <div className="mt-3 space-y-2 border-t border-border/70 pt-3"><p className="text-[11px] font-semibold text-muted-foreground">相关课程资料</p>{message.sources.map((material, index) => onOpenMaterial ? <button key={material.id} type="button" onClick={() => onOpenMaterial(material)} className="flex w-full items-center gap-2 rounded-lg bg-secondary/70 px-3 py-2 text-left text-xs text-foreground transition hover:bg-secondary"><span className="shrink-0 font-semibold text-primary">资料{index + 1}</span><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 font-medium">{material.title}</span><ExternalLink className="size-3 shrink-0 text-muted-foreground" /></button> : <a key={material.id} href={material.path} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-2 text-xs text-foreground transition hover:bg-secondary"><span className="shrink-0 font-semibold text-primary">资料{index + 1}</span><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 font-medium">{material.title}</span><ExternalLink className="size-3 shrink-0 text-muted-foreground" /></a>)}</div> : null}{message.fallback && <p className="mt-2 text-[11px] text-muted-foreground">已自动切换为本地资料检索</p>}</div></div>)}
        {loading && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"><LoaderCircle className="size-4 animate-spin" />课程助教正在整理回答……</div></div>}
      </div>

      <div className="border-t bg-card p-4 sm:p-5">
        {messages.length === 1 && <div className="mb-3 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/35 hover:text-primary" type="button">{suggestion}</button>)}</div>}
        <form onSubmit={(event) => { event.preventDefault(); void ask(query); }} className="flex items-end gap-2">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(query); } }} placeholder="例如：透视表应该怎么理解？" aria-label="向课程助教提问" className="max-h-32 min-h-11 resize-none bg-background" disabled={loading} />
          <Button type="submit" size="icon-lg" className="mb-0.5 shrink-0" disabled={!query.trim() || loading} aria-label="发送问题"><Send /></Button>
        </form>
        <p className="mt-2 text-[11px] text-muted-foreground">Enter 发送 · Shift + Enter 换行 · 回答仅供学习参考</p>
      </div>
    </div>
  );
}
