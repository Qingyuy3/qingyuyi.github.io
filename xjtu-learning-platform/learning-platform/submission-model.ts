import type { CourseFile, Assignment } from './file-client';
import type { LearningUser } from './session';

export type Overview = {
  users: LearningUser[];
  assignments: Assignment[];
  assignmentId: string;
  files: CourseFile[];
};
export type SubmissionStatus = 'missing' | 'pending' | 'graded';
export const statusLabel = {
  missing: '未交',
  pending: '待批改',
  graded: '已批改',
};
export function submissionRows(data: Overview) {
  return data.users
    .filter((u) => u.role === 'student')
    .map((user) => {
      const versions = data.files
        .filter(
          (f) =>
            f.owner_id === user.id && f.assignment_id === data.assignmentId,
        )
        .sort(
          (a, b) => b.completed_at - a.completed_at || b.id.localeCompare(a.id),
        );
      const latest = versions[0];
      const status: SubmissionStatus = !latest
        ? 'missing'
        : latest.grade !== null || latest.feedback.trim()
          ? 'graded'
          : 'pending';
      return { user, versions, latest, status };
    });
}

// Limit fallback Blob memory use. A single upload is already limited to 100 MiB.
export function downloadBatches<T extends { bytes: number }>(
  files: T[],
  limit = 100 * 1024 * 1024,
) {
  const batches: T[][] = [];
  let size = 0;
  for (const file of files) {
    if (!batches.length || size + file.bytes > limit) {
      batches.push([]);
      size = 0;
    }
    batches[batches.length - 1].push(file);
    size += file.bytes;
  }
  return batches;
}
export function safeFilename(value: string) {
  const safe = value
    .replace(/[\x00-\x1f<>:"/\\|?*]/g, '_')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 100);
  return safe || '文件';
}

export function recordsCsv(rows: unknown[][]) {
  const cell = (v: unknown) =>
    `"${String(v ?? '')
      .replace(/^(\s*[=+@-])/, "'$1")
      .replaceAll('"', '""')}"`;
  return '\ufeff' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
