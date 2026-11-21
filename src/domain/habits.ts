import { addDays, type ISODate } from '@/lib/dates';
import type { Habit, HabitLog } from './types';

export interface HabitWithState extends Habit {
  doneToday: boolean;
  /** Consecutive days completed, ending today (or yesterday if today is still open). */
  streak: number;
}

/** How far back streaks are computed. */
export const STREAK_WINDOW_DAYS = 60;

export function computeStreak(dates: ReadonlySet<ISODate>, day: ISODate): number {
  let cursor = dates.has(day) ? day : addDays(day, -1);
  let streak = 0;
  while (dates.has(cursor) && streak <= STREAK_WINDOW_DAYS) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function withHabitState(habits: Habit[], logs: HabitLog[], day: ISODate): HabitWithState[] {
  const byHabit = new Map<string, Set<ISODate>>();
  for (const log of logs) {
    const set = byHabit.get(log.habitId) ?? new Set<ISODate>();
    set.add(log.logDate);
    byHabit.set(log.habitId, set);
  }
  return habits.map((h) => {
    const dates = byHabit.get(h.id) ?? new Set<ISODate>();
    return { ...h, doneToday: dates.has(day), streak: computeStreak(dates, day) };
  });
}
