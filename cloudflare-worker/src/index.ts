import { course, materials, modules, type Material } from '../../data/course';

type ClientMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const allowedOrigins = new Set([
  'https://qingyuy3.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const chineseNumbers: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

function corsHeaders(origin: string | null) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Max-Age', '86400');
    headers.set('Vary', 'Origin');
  }
  return headers;
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request.headers.get('Origin')),
  });
}

function extractNumber(query: string, unit: '章' | '周') {
  const digit = query.match(new RegExp(`第?([1-9])${unit}`));
  if (digit) return Number(digit[1]);
  const chinese = query.match(new RegExp(`第?([一二三四五六七八九])${unit}`));
  return chinese ? chineseNumbers[chinese[1]] : undefined;
}

function searchMaterials(rawQuery: string): Material[] {
  const query = rawQuery.toLowerCase().replaceAll('张', '章').trim();
  if (!query) return [];

  const chapter = extractNumber(query, '章');
  const week = extractNumber(query, '周');
  const terms = query.split(/[\s，。、“”‘’？！,.!?/]+/).filter((term) => term.length > 1);

  return materials
    .map((material) => {
      const haystack = [material.title, material.summary, material.type, material.format, ...material.keywords].join(' ').toLowerCase();
      let score = 0;
      if (chapter === material.chapter) score += 8;
      if (week === material.week) score += 7;
      if (haystack.includes(query)) score += 10;
      for (const term of terms) if (haystack.includes(term)) score += term.length;
      if (query.includes('python') && haystack.includes('python')) score += 8;
      if ((query.includes('爬虫') || query.includes('抓取')) && haystack.includes('爬虫')) score += 8;
      if ((query.includes('数据') || query.includes('csv')) && material.type === '数据') score += 4;
      if ((query.includes('代码') || query.includes('notebook')) && material.type === '代码') score += 4;
      if ((query.includes('练习') || query.includes('作业')) && material.type === '作业') score += 4;
      if ((query.includes('课件') || query.includes('ppt')) && material.type === '课件') score += 4;
      return { material, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.material);
}

async function parseJsonWithLimit<T>(message: Request | Response, maxBytes: number): Promise<T> {
  const declaredLength = Number(message.headers.get('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('payload_too_large');

  const reader = message.body?.getReader();
  if (!reader) throw new Error('empty_payload');

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error('payload_too_large');
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(merged)) as T;
}

function buildSystemPrompt(relevantMaterials: Material[]) {
  const courseOutline = modules.map((module) => `第${module.chapter}单元 ${module.title}：${module.description}`).join('\n');
  const sourceContext = relevantMaterials.length
    ? relevantMaterials.map((material, index) => `[资料${index + 1}] ${material.title}（第${material.chapter}单元，${material.type}）\n摘要：${material.summary}\n关键词：${material.keywords.join('、')}`).join('\n\n')
    : '本次问题没有匹配到明确的课程文件。';

  return `你是西安交通大学管理学院《${course.title}》课程的中文助教。你服务于正在学习数据分析、机器学习和网络爬虫的学生。

回答规则：
1. 优先依据下方课程结构和检索到的课程资料回答；资料不足时明确说明，不要虚构课件原文、页码或教师要求。
2. 回答使用自然、清楚的中文。出现重要技术术语时，同时给出英文名称和一句中文解释。
3. 面对作业题，先给分析思路、分步提示和自查方法；不要假装已经运行学生的代码或查看未提供的数据。
4. 回答尽量控制在 600 个汉字以内，可用短段落或编号步骤；请输出纯文本，不要使用 Markdown 标记。
5. 引用课程资料时使用 [资料1]、[资料2] 这样的编号。没有匹配资料时不要编造引用。
6. 与本课程无关的问题，简短说明职责范围，并引导学生回到课程主题。

课程结构：
${courseOutline}

本轮检索到的资料：
${sourceContext}`;
}

async function handleQuestion(request: Request, env: Env) {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins.has(origin)) {
    return json(request, { error: '当前来源不允许访问课程助教。' }, 403);
  }

  const rateLimit = await env.COURSE_TA_RATE_LIMITER.limit({ key: `${origin}:/api/ta` });
  if (!rateLimit.success) {
    return json(request, { error: '提问有些频繁，请一分钟后再试。' }, 429);
  }
  if (!env.DEEPSEEK_API_KEY?.trim()) {
    return json(request, { error: '课程助教尚未完成接口配置。' }, 503);
  }

  let body: { messages?: ClientMessage[] };
  try {
    body = await parseJsonWithLimit<{ messages?: ClientMessage[] }>(request, 16 * 1024);
  } catch {
    return json(request, { error: '问题格式不正确。' }, 400);
  }

  const messages = (body.messages || [])
    .filter((message): message is ClientMessage =>
      (message?.role === 'user' || message?.role === 'assistant') && typeof message.content === 'string',
    )
    .slice(-6)
    .map((message) => ({ ...message, content: message.content.trim().slice(0, 1200) }))
    .filter((message) => message.content.length > 0);

  const latestQuestion = [...messages].reverse().find((message) => message.role === 'user')?.content;
  if (!latestQuestion) return json(request, { error: '请输入想询问的课程问题。' }, 400);

  const searchQuery = messages.filter((message) => message.role === 'user').slice(-2).map((message) => message.content).join(' ');
  const relevantMaterials = searchMaterials(searchQuery);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        messages: [{ role: 'system', content: buildSystemPrompt(relevantMaterials) }, ...messages],
        thinking: { type: 'disabled' },
        max_tokens: 800,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error(JSON.stringify({ event: 'deepseek_request_failed', status: response.status }));
      return json(request, {
        error: response.status === 401 ? '课程助教的接口密钥无效，请联系维护人员。' : '课程助教暂时无法回答，请稍后再试。',
      }, 502);
    }

    const result = await parseJsonWithLimit<{ choices?: Array<{ message?: { content?: string } }> }>(response, 64 * 1024);
    const answer = result.choices?.[0]?.message?.content?.trim();
    if (!answer) return json(request, { error: '课程助教没有返回有效回答，请换一种问法。' }, 502);

    return json(request, { answer, sourceIds: relevantMaterials.map((material) => material.id) });
  } catch (error) {
    console.error(JSON.stringify({ event: 'deepseek_connection_failed', error: error instanceof Error ? error.message : 'unknown' }));
    return json(request, { error: '课程助教连接失败，请稍后重试。' }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.has(origin)) return json(request, { error: '不允许的访问来源。' }, 403);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json(request, { ok: true, service: '西安交通大学管理学院课程助教' });
    }

    if (request.method === 'POST' && url.pathname === '/api/ta') {
      return handleQuestion(request, env);
    }

    return json(request, { error: '接口不存在。' }, 404);
  },
} satisfies ExportedHandler<Env>;

