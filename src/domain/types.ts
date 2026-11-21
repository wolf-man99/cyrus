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
  timezone: string;
}

/* ───────────── Today ───────────── */

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
  'sun',
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
  'sparkles',
] as const;
export type HabitIcon = (typeof HABIT_ICONS)[number];

/* ───────────── Goals ───────────── */

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal {
  id: string;
  domain: LifeDomain;
  title: string;
  description: string | null;
  category: string | null;
  /** Where the goal started — lets "count down" goals (lose weight, pay off debt) show progress. */
  startValue: number | null;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  targetDate: ISODate | null;
  status: GoalStatus;
  createdAt: string;
}

/* ───────────── Logs shared by every domain ───────────── */

/** Numeric time series: mood, energy, body measurements, balances. */
export interface DomainMetric {
  id: string;
  domain: LifeDomain;
  metric: string;
  value: number;
  unit: string | null;
  note: string | null;
  recordedAt: string;
}

/** One thing that happened in a domain: a meditation, a talk, an achievement, a reading session. */
export interface ActivityLog {
  id: string;
  domain: LifeDomain;
  kind: string;
  title: string;
  value: number | null;
  unit: string | null;
  notes: string | null;
  details: Record<string, unknown>;
  goalId: string | null;
  occurredAt: string;
}

/* ───────────── Physical ───────────── */

export interface WeightLog {
  id: string;
  value: number;
  unit: WeightUnit;
  loggedAt: string;
}

export const WORKOUT_TYPES = ['Strength', 'Run', 'Cardio', 'HIIT', 'Yoga', 'Walk', 'Cycling', 'Sport', 'Other'] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];
export type WorkoutIntensity = 'easy' | 'moderate' | 'hard';

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
}

export interface Workout {
  id: string;
  workoutType: WorkoutType;
  durationMin: number;
  intensity: WorkoutIntensity | null;
  notes: string | null;
  exercises: Exercise[];
  performedAt: string;
}

export interface HealthReport {
  id: string;
  title: string;
  storagePath: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  reportDate: ISODate | null;
  notes: string | null;
  createdAt: string;
}

/* ───────────── Financial ───────────── */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Groceries',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Fun',
  'Learning',
  'Travel',
  'Other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  note: string | null;
  occurredAt: string;
}

export const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Investments', 'Gift', 'Other'] as const;

export interface Income {
  id: string;
  amount: number;
  currency: string;
  source: string;
  note: string | null;
  receivedAt: string;
}

export const INVESTMENT_KINDS = ['stocks', 'funds', 'crypto', 'bonds', 'property', 'retirement', 'cash', 'other'] as const;
export type InvestmentKind = (typeof INVESTMENT_KINDS)[number];

export interface Investment {
  id: string;
  name: string;
  kind: InvestmentKind;
  investedAmount: number;
  currentValue: number;
  currency: string;
  valueUpdatedAt: string;
}

/* ───────────── Intellectual & career ───────────── */

export const LEARNING_KINDS = ['book', 'course', 'article', 'video', 'podcast'] as const;
export type LearningKind = (typeof LEARNING_KINDS)[number];
export type LearningStatus = 'planned' | 'active' | 'completed' | 'paused';
export type LearningUnit = 'pages' | 'lessons' | 'chapters' | 'hours' | 'percent';

export interface LearningResource {
  id: string;
  kind: LearningKind;
  title: string;
  author: string | null;
  status: LearningStatus;
  progress: number;
  total: number | null;
  unit: LearningUnit;
  rating: number | null;
  notes: string | null;
  startedAt: ISODate | null;
  completedAt: ISODate | null;
  updatedAt: string;
}

export type SkillDomain = Extract<LifeDomain, 'intellectual' | 'career'>;

export interface Skill {
  id: string;
  domain: SkillDomain;
  name: string;
  level: number;
  targetLevel: number | null;
  notes: string | null;
  updatedAt: string;
}

export type ProjectDomain = Extract<LifeDomain, 'career' | 'entrepreneurship'>;
export type ProjectKind = 'project' | 'idea' | 'venture' | 'experiment';
export type ProjectStatus = 'idea' | 'active' | 'paused' | 'completed' | 'dropped';

export interface Project {
  id: string;
  domain: ProjectDomain;
  kind: ProjectKind;
  title: string;
  description: string | null;
  status: ProjectStatus;
  hypothesis: string | null;
  outcome: string | null;
  startedAt: ISODate | null;
  completedAt: ISODate | null;
  updatedAt: string;
}

/* ───────────── Reflect ───────────── */

export type ReflectionPeriod = 'daily' | 'weekly' | 'monthly';

export interface Reflection {
  id: string;
  period: ReflectionPeriod;
  periodStart: ISODate;
  mood: number | null;
  energy: number | null;
  responses: Record<string, string>;
  domainRatings: Partial<Record<LifeDomain, number>>;
  goalIds: string[];
  updatedAt: string;
}

/* ───────────── Assistant memory ───────────── */

export interface Conversation {
  id: string;
  title: string | null;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
}

export interface ActionRecord {
  capability: string;
  summary: string;
  ok: boolean;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  actions: ActionRecord[];
  createdAt: string;
}
