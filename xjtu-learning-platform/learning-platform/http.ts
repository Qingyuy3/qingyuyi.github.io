export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireCondition(
  value: unknown,
  status: number,
  message: string,
): asserts value {
  if (!value) throw new HttpError(status, message);
}
export async function bytes(request: Request, limit: number) {
  const reader = request.body?.getReader();
  requireCondition(reader, 400, '请求内容为空。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, '内容超过大小限制。');
    }
    chunks.push(item.value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  requireCondition(
    request.headers.get('Content-Type')?.startsWith('application/json'),
    415,
    '请使用 JSON 格式。',
  );
  try {
    const value: unknown = JSON.parse(
      new TextDecoder().decode(await bytes(request, 32 * 1024)),
    );
    requireCondition(
      value && typeof value === 'object' && !Array.isArray(value),
      400,
      '请求格式不正确。',
    );
    return value as Record<string, unknown>;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, '请求格式不正确。');
  }
}
export function text(
  value: unknown,
  max: number,
  label: string,
  allowEmpty = false,
): string {
  requireCondition(typeof value === 'string', 400, `${label}格式不正确。`);
  const result = value.trim();
  requireCondition(
    (allowEmpty || result.length > 0) && result.length <= max,
    400,
    `${label}不能为空或过长。`,
  );
  return result;
}
export function integer(value: unknown, min: number, max: number): number {
  requireCondition(
    typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max,
    400,
    '数值超出范围。',
  );
  return value;
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}
export function protect(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('X-Frame-Options', 'DENY');
  return new Response(response.body, { status: response.status, headers });
}
export async function consume(
  env: PlatformEnv,
  key: string,
  seconds: number,
  maximum: number,
) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const row =
    await env.DB.prepare(`INSERT INTO counters(key,window,count,expires_at) VALUES(?,?,1,?)
    ON CONFLICT(key,window) DO UPDATE SET count=count+1 WHERE count<? RETURNING count`)
      .bind(key, window, Date.now() + seconds * 2000, maximum)
      .first();
  requireCondition(row, 429, '操作次数已达限额，请稍后再试。');
}
export async function audit(
  env: PlatformEnv,
  actor: string,
  action: string,
  target: string,
) {
  await env.DB.prepare('INSERT INTO audit VALUES(?,?,?,?,?)')
    .bind(crypto.randomUUID(), actor, action, target, Date.now())
    .run();
}
