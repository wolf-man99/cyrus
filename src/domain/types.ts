import type { ISODate } from '@/lib/dates';

/** The seven life domains CYRUS tracks. Mirrors the `life_domain` Postgres enum. */
export const LIFE_DOMAINS = [
  'physical',
  'mental',
  'intellectual',
  'financial',
  'social',
  'career',
  'entrepreneurship',
] as const;
export type LifeDomain = (typeof LIFE_DOMAINS)[number];

export type WeightUnit = 'kg' | 'lb';

export interface Profile {
  id: string;
  displayName: string | null;
  weightUnit: WeightUnit;
  currency: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  domain: LifeDomain | null;
  /** Local calendar date the task is due. */
  dueDate: ISODate | null;
  /** Optional `HH:MM` — a timed task is a commitment. */
  dueTime: string | null;
  isPriority: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  title: string;
  icon: HabitIcon;
  domain: LifeDomain | null;
  sortOrder: number;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: ISODate;
}

export const HABIT_ICONS = [
  'sparkles',
  'dumbbell',
  'footprints',
  'droplet',
  'book-open',
  'brain',
  'pen-line',
  'moon',
  'apple',
  'piggy-bank',
  'messages-square',
  'sun',
] as const;
export type HabitIcon = (typeof HABIT_ICONS)[number];

export interface WeightLog {
  id: string;
  value: number;
  unit: WeightUnit;
  loggedAt: string;
}

export const WORKOUT_TYPES = ['Strength', 'Run', 'Cardio', 'HIIT', 'Yoga', 'Walk', 'Cycling', 'Sport', 'Other'] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];
export type WorkoutIntensity = 'easy' | 'moderate' | 'hard';

export interface Workout {
  id: string;
  workoutType: WorkoutType;
  durationMin: number;
  intensity: WorkoutIntensity | null;
  performedAt: string;
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Fun',
  'Learning',
  'Other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Transaction {
  id: string;
  kind: 'expense' | 'income';
  amount: number;
  currency: string;
  category: string;
  note: string | null;
  occurredAt: string;
}

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface Goal {
  id: string;
  domain: LifeDomain;
  title: string;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  targetDate: ISODate | null;
  status: GoalStatus;
}

export type ReflectionPeriod = 'daily' | 'weekly' | 'monthly';

export interface Reflection {
  id: string;
  period: ReflectionPeriod;
  periodStart: ISODate;
  mood: number | null;
  energy: number | null;
  responses: Record<string, string>;
  updatedAt: string;
}
