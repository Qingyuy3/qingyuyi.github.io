import { course, materials, modules } from '@/data/course';
import { searchMaterials } from '@/lib/course-search';

type ClientMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://qingyuy3.github.io',
  'https://xjtu-smart-class-demo.yiqingyuteddy.chatgpt.site',
]);

const requestWindows = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return headers;
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function withinDemoLimit(request: Request) {
  const client = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  const now = Date.now();
  const current = requestWindows.get(client);
  if (!current || current.resetAt <= now) {
    requestWindows.set(client, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 30;
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  if (!withinDemoLimit(request)) {
    return json(request, { error: '提问有些频繁，请稍后再试。' }, 429);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return json(request, { error: '课程助教尚未完成接口配置。' }, 503);
  }

  let body: { messages?: ClientMessage[] };
  try {
    body = await request.json();
  } catch {
    return json(request, { error: '问题格式不正确。' }, 400);
  }

  const messages = (body.messages || [])
    .filter((message): message is ClientMessage =>
      (message?.role === 'user' || message?.role === 'assistant') && typeof message.content === 'string',
    )
    .slice(-8)
    .map((message) => ({ ...message, content: message.content.trim().slice(0, 1600) }))
    .filter((message) => message.content.length > 0);

  const latestQuestion = [...messages].reverse().find((message) => message.role === 'user')?.content;
  if (!latestQuestion) {
    return json(request, { error: '请输入想询问的课程问题。' }, 400);
  }

  const searchQuery = messages.filter((message) => message.role === 'user').slice(-2).map((message) => message.content).join(' ');
  const relevantMaterials = searchMaterials(searchQuery).slice(0, 5);
  const courseOutline = modules.map((module) => `第${module.chapter}单元 ${module.title}：${module.description}`).join('\n');
  const sourceContext = relevantMaterials.length
    ? relevantMaterials.map((material, index) => `[资料${index + 1}] ${material.title}（第${material.chapter}单元，${material.type}）\n摘要：${material.summary}\n关键词：${material.keywords.join('、')}`).join('\n\n')
    : '本次问题没有匹配到明确的课程文件。';

  const systemPrompt = `你是西安交通大学管理学院《${course.title}》课程的中文助教。你服务于正在学习数据分析、机器学习和网络爬虫的学生。

回答规则：
1. 优先依据下方课程结构和检索到的课程资料回答；资料不足时明确说明，不要虚构课件原文、页码或教师要求。
2. 回答使用自然、清楚的中文。出现重要技术术语时，同时给出英文名称和一句中文解释。
3. 面对作业题，先给分析思路、分步提示和自查方法；不要假装已经运行学生的代码或查看未提供的数据。
4. 回答尽量控制在 600 个汉字以内，可用短段落或编号步骤，不需要客套话；请输出纯文本，不要使用星号粗体、标题井号等 Markdown 标记。
5. 引用课程资料时使用 [资料1]、[资料2] 这样的编号。没有匹配资料时不要编造引用。
6. 与本课程无关的问题，简短说明你的职责范围，并引导学生回到课程主题。

课程结构：
${courseOutline}

本轮检索到的资料：
${sourceContext}`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        thinking: { type: 'disabled' },
        max_tokens: 900,
        stream: false,
      }),
    });

    if (!response.ok) {
      return json(request, { error: response.status === 401 ? '课程助教的接口密钥无效，请联系维护人员。' : '课程助教暂时无法回答，请稍后再试。' }, 502);
    }

    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = result.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return json(request, { error: '课程助教没有返回有效回答，请换一种问法。' }, 502);
    }

    return json(request, {
      answer,
      sourceIds: relevantMaterials.map((material) => material.id),
    });
  } catch {
    return json(request, { error: '课程助教连接失败，请稍后重试。' }, 502);
  }
}
