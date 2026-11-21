import type { ISODate } from '@/lib/dates';
import type { LifeDomain, ReflectionPeriod } from '@/domain/types';

/** Central React Query keys. */
export const qk = {
  profile: ['profile'] as const,
  tasks: ['tasks'] as const,
  tasksForDay: (date: ISODate) => ['tasks', 'day', date] as const,
  tasksUpcoming: (date: ISODate) => ['tasks', 'upcoming', date] as const,
  habits: ['habits'] as const,
  habitLogs: (from: ISODate, to: ISODate) => ['habit-logs', from, to] as const,
  weight: ['weight'] as const,
  workouts: ['workouts'] as const,
  transactions: ['transactions'] as const,
  goals: (domain?: LifeDomain) => ['goals', domain ?? 'all'] as const,
  reflections: (period: ReflectionPeriod) => ['reflections', period] as const,
};
