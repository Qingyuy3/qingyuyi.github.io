import type { Assignment, CourseFile } from './file-client';
export function studentTodos(
  assignments: Assignment[],
  files: CourseFile[],
  now: number,
) {
  const submitted = new Set(files.map((f) => f.assignment_id));
  const missing = assignments.filter((a) => !submitted.has(a.id));
  return {
    week: missing
      .filter(
        (a) =>
          !a.closed &&
          a.deadline !== null &&
          a.deadline >= now &&
          a.deadline <= now + 7 * 86400000,
      )
      .sort((a, b) => a.deadline! - b.deadline!),
    overdue: missing
      .filter((a) => !a.closed && a.deadline !== null && a.deadline < now)
      .sort((a, b) => b.deadline! - a.deadline!),
    later: missing.filter(
      (a) =>
        !a.closed && (a.deadline === null || a.deadline > now + 7 * 86400000),
    ),
    closed: missing.filter((a) => !!a.closed),
  };
}
