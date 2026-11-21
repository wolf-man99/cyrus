import type { ISODate } from '@/lib/dates';
import type { ReflectionPeriod } from '@/domain/types';

/**
 * Central React Query keys. The first segment is the "root" a mutation invalidates,
 * so every cached view of that data refreshes together.
 */
export type QueryRoot =
  | 'profile'
  | 'tasks'
  | 'habits'
  | 'habit-logs'
  | 'goals'
  | 'metrics'
  | 'activities'
  | 'weight'
  | 'workouts'
  | 'expenses'
  | 'income'
  | 'investments'
  | 'learning'
  | 'skills'
  | 'projects'
  | 'health-reports'
  | 'reflections'
  | 'conversations';

export const qk = {
  profile: ['profile'] as const,
  tasks: ['tasks'] as const,
  tasksForDay: (date: ISODate) => ['tasks', 'day', date] as const,
  tasksUpcoming: (date: ISODate) => ['tasks', 'upcoming', date] as const,
  tasksBetween: (from: ISODate, to: ISODate) => ['tasks', 'between', from, to] as const,
  habits: ['habits'] as const,
  habitLogs: (from: ISODate, to: ISODate) => ['habit-logs', from, to] as const,
  list: (root: QueryRoot, args?: unknown) => [root, 'list', args ?? null] as const,
  reflection: (period: ReflectionPeriod, start: ISODate) => ['reflections', 'one', period, start] as const,
};
