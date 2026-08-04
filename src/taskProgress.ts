export function subtaskProgress(subtasks: { done: boolean }[]) {
  if (subtasks.length === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = subtasks.filter((item) => item.done).length;
  return { completed, total: subtasks.length, percent: Math.round((completed / subtasks.length) * 100) };
}
