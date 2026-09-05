export function connectionMessage(path: string, method: string) {
  if (path === '/password')
    return '暂时无法确认改密结果。请勿反复提交；退出后尝试用新密码登录，若仍失败请联系教师重置。';
  return method === 'GET'
    ? '暂时无法连接课程平台，请检查网络，稍后刷新。'
    : '暂时无法确认操作结果，请先刷新查看是否已保存，再决定是否重试。';
}

export async function api<T>(
  path: string,
  method = 'GET',
  data?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const uncertain = connectionMessage(path, method);
  try {
    let response: Response;
    try {
      response = await fetch(`/api${path}`, {
        method,
        credentials: 'same-origin',
        signal: controller.signal,
        headers:
          data === undefined
            ? undefined
            : { 'Content-Type': 'application/json' },
        ...(data !== undefined && !['GET', 'HEAD'].includes(method)
          ? { body: JSON.stringify(data) }
          : {}),
      });
    } catch {
      throw new Error(uncertain);
    }
    let result: unknown;
    try {
      if (!response.headers.get('Content-Type')?.includes('application/json'))
        throw new Error();
      result = await response.json();
    } catch {
      throw new Error(uncertain);
    }
    if (!response.ok) {
      const message =
        result &&
        typeof result === 'object' &&
        'error' in result &&
        typeof result.error === 'string'
          ? result.error
          : '';
      throw new Error(
        message ||
          (response.status === 401
            ? '登录已失效，请重新登录。'
            : '操作未完成，请稍后重试。'),
      );
    }
    return result as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function passwordProblem(
  current: string,
  next: string,
  confirm: string,
) {
  if (next.length < 12 || next.length > 128) return '新密码需要 12–128 位。';
  if (next !== next.trim()) return '新密码首尾不能有空格，请删除后再保存。';
  if (next === current) return '新密码不能与当前密码相同。';
  if (next !== confirm) return '两次输入的新密码不一致。';
  return '';
}
