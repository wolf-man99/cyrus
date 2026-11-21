import type { Task } from './types';
import type { HabitWithState } from './habits';

export interface DailyProgress {
  done: number;
  total: number;
  ratio: number;
}

/** Today's progress = completed tasks + habits over everything planned for today. */
export function dailyProgress(tasks: Task[], habits: HabitWithState[]): DailyProgress {
  const total = tasks.length + habits.length;
  const done = tasks.filter((t) => t.completedAt !== null).length + habits.filter((h) => h.doneToday).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
