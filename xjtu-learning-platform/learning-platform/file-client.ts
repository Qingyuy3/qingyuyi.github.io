import { api } from './session';
export type CourseFile = {
  id: string;
  owner_id: string;
  assignment_id: string | null;
  title: string;
  filename: string;
  module: number;
  bytes: number;
  completed_at: number;
  feedback: string;
  grade: number | null;
  name: string;
};
export type Assignment = {
  id: string;
  title: string;
  description: string;
  module: number;
  deadline: number | null;
  closed: number;
};
export const date = (timestamp: number | null) =>
  timestamp
    ? new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
    : '未设置';

export async function uploadFile(
  file: File,
  metadata: {
    kind: 'material' | 'submission';
    title: string;
    module: number;
    assignmentId?: string;
  },
  progress: (value: number) => void,
) {
  if (!file.size || file.size > 100 * 1024 * 1024)
    throw new Error('请选择不超过 100 MB 的非空文件。');
  const { id, chunkSize } = await api<{ id: string; chunkSize: number }>(
    '/uploads',
    'POST',
    { ...metadata, filename: file.name, bytes: file.size },
  );
  try {
    for (
      let offset = 0, part = 1;
      offset < file.size;
      offset += chunkSize, part++
    ) {
      let failure: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(`/api/uploads/${id}/parts/${part}`, {
            method: 'PUT',
            body: file.slice(offset, offset + chunkSize),
            credentials: 'same-origin',
          });
          if (!response.ok) {
            const result = await response.json();
            throw new Error(
              result && typeof result === 'object' && 'error' in result
                ? String(result.error)
                : '分块上传失败。',
            );
          }
          failure = null;
          break;
        } catch (e) {
          failure = e instanceof Error ? e : new Error('上传失败。');
        }
      }
      if (failure) throw failure;
      progress(
        Math.round((Math.min(offset + chunkSize, file.size) / file.size) * 95),
      );
    }
    const result = await api<{ id: string; completedAt: number }>(
      `/uploads/${id}/complete`,
      'POST',
    );
    progress(100);
    return result;
  } catch (e) {
    // Best-effort cancellation; a lost completion response can already be ready.
    await api(`/uploads/${id}`, 'DELETE').catch(() => undefined);
    throw e;
  }
}
