import { z } from 'zod';
import {
  EXPENSE_CATEGORIES,
  HABIT_ICONS,
  INVESTMENT_KINDS,
  LEARNING_KINDS,
  LIFE_DOMAINS,
  WORKOUT_TYPES,
} from './types';

/**
 * Input validation for everything a user (or the assistant, on the user's behalf) can write.
 * The same limits exist again in Postgres as CHECK constraints.
 */

const domain = z.enum(LIFE_DOMAINS);
const isoDate = z.iso.date({ error: 'Choose a valid date' });
const timestamp = z.iso.datetime({ offset: true, error: 'Invalid time' });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Choose a valid time' });
const currency = z.string().regex(/^[A-Z]{3}$/, { error: 'Use a 3-letter currency code' });
const money = (max: number) =>
  z
    .number({ error: 'Enter an amount' })
    .positive({ error: 'Enter an amount' })
    .max(max, { error: 'That looks too high' })
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, { error: 'Use at most two decimals' });
const optionalText = (max: number) => z.string().trim().max(max).nullable().default(null);
const title = (max: number, error = 'Give it a name') =>
  z.string().trim().min(1, { error }).max(max, { error: `Keep it under ${max} characters` });

/* ───────────── Today ───────────── */

export const newTaskSchema = z.object({
  title: title(200, 'Give the task a name'),
  notes: optionalText(2000),
  domain: domain.nullable().default(null),
  dueDate: isoDate.nullable(),
  dueTime: hhmm.nullable().default(null),
  isPriority: z.boolean().default(false),
});
export type NewTaskInput = z.input<typeof newTaskSchema>;
export type NewTask = z.output<typeof newTaskSchema>;

export const taskUpdateSchema = z
  .object({
    title: title(200),
    notes: z.string().trim().max(2000).nullable(),
    domain: domain.nullable(),
    dueDate: isoDate.nullable(),
    dueTime: hhmm.nullable(),
    isPriority: z.boolean(),
  })
  .partial();
export type TaskUpdate = z.output<typeof taskUpdateSchema>;

export const newHabitSchema = z.object({
  title: title(60, 'Name your habit'),
  icon: z.enum(HABIT_ICONS),
  domain: domain.nullable().default(null),
});
export type NewHabit = z.output<typeof newHabitSchema>;

/* ───────────── Goals ───────────── */

const goalFields = {
  domain,
  title: title(120, 'Name the goal'),
  description: optionalText(2000),
  category: z.string().regex(/^[a-z_]{1,32}$/).nullable().default(null),
  startValue: z.number().finite().nullable().default(null),
  targetValue: z.number().finite().nullable().default(null),
  currentValue: z.number().finite().default(0),
  unit: z.string().trim().max(20).nullable().default(null),
  targetDate: isoDate.nullable().default(null),
};
export const newGoalSchema = z.object(goalFields);
export type NewGoal = z.output<typeof newGoalSchema>;

export const goalUpdateSchema = z
  .object({
    title: goalFields.title,
    description: z.string().trim().max(2000).nullable(),
    category: z.string().regex(/^[a-z_]{1,32}$/).nullable(),
    startValue: z.number().finite().nullable(),
    targetValue: z.number().finite().nullable(),
    currentValue: z.number().finite(),
    unit: z.string().trim().max(20).nullable(),
    targetDate: isoDate.nullable(),
    status: z.enum(['active', 'completed', 'paused', 'archived']),
  })
  .partial();
export type GoalUpdate = z.output<typeof goalUpdateSchema>;

/* ───────────── Shared logs ───────────── */

export const metricEntrySchema = z
  .object({
    domain,
    metric: z.string().regex(/^[a-z_]{1,32}$/),
    value: z.number({ error: 'Enter a value' }).finite({ error: 'Enter a value' }),
    unit: z.string().trim().max(12).nullable().default(null),
    note: optionalText(500),
    recordedAt: timestamp.optional(),
  })
  .refine((m) => !['mood', 'energy'].includes(m.metric) || (Number.isInteger(m.value) && m.value >= 1 && m.value <= 5), {
    error: 'Use a value from 1 to 5',
    path: ['value'],
  });
export type MetricEntry = z.output<typeof metricEntrySchema>;

export const activityEntrySchema = z.object({
  domain,
  kind: z.string().regex(/^[a-z_]{1,32}$/),
  title: title(160, 'Add a short title'),
  value: z.number().finite().min(0, { error: 'Use a positive number' }).nullable().default(null),
  unit: z.string().trim().max(20).nullable().default(null),
  notes: optionalText(4000),
  details: z.record(z.string(), z.unknown()).default({}),
  goalId: z.uuid().nullable().default(null),
  occurredAt: timestamp.optional(),
});
export type ActivityEntry = z.output<typeof activityEntrySchema>;

/* ───────────── Physical ───────────── */

export const weightEntrySchema = z.object({
  value: z
    .number({ error: 'Enter your weight' })
    .positive({ error: 'Enter your weight' })
    .lt(1000, { error: 'That looks too high' })
    .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6, { error: 'Use at most one decimal place' }),
  unit: z.enum(['kg', 'lb']),
});
export type WeightEntry = z.output<typeof weightEntrySchema>;

export const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sets: z.number().int().min(1).max(50).optional(),
  reps: z.number().int().min(1).max(500).optional(),
  weight: z.number().min(0).max(1000).optional(),
});

export const workoutEntrySchema = z.object({
  workoutType: z.enum(WORKOUT_TYPES, { error: 'Pick a workout type' }),
  durationMin: z
    .number({ error: 'Enter a duration' })
    .int({ error: 'Use whole minutes' })
    .min(1, { error: 'Enter a duration' })
    .max(600, { error: 'Keep it under 10 hours' }),
  intensity: z.enum(['easy', 'moderate', 'hard']).nullable().default(null),
  notes: optionalText(1000),
  exercises: z.array(exerciseSchema).max(50).default([]),
});
export type WorkoutEntry = z.output<typeof workoutEntrySchema>;

export const HEALTH_REPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const;
export const HEALTH_REPORT_MAX_BYTES = 20 * 1024 * 1024;

export const healthReportSchema = z.object({
  title: title(120, 'Name the report'),
  reportDate: isoDate.nullable().default(null),
  notes: optionalText(2000),
});
export type HealthReportInput = z.output<typeof healthReportSchema>;

/** Validates a file before upload; returns an error message or null. */
export function checkReportFile(file: { type: string; size: number }): string | null {
  if (!HEALTH_REPORT_TYPES.includes(file.type as (typeof HEALTH_REPORT_TYPES)[number])) {
    return 'Upload a PDF or an image (JPG, PNG, HEIC, WebP)';
  }
  if (file.size > HEALTH_REPORT_MAX_BYTES) return 'Files can be up to 20 MB';
  if (file.size === 0) return 'That file is empty';
  return null;
}

/* ───────────── Financial ───────────── */

export const expenseEntrySchema = z.object({
  amount: money(1_000_000),
  category: z.enum(EXPENSE_CATEGORIES, { error: 'Pick a category' }),
  note: z.string().trim().max(140, { error: 'Keep the note short' }).nullable().default(null),
  currency,
  occurredAt: timestamp.optional(),
});
export type ExpenseEntry = z.output<typeof expenseEntrySchema>;

export const incomeEntrySchema = z.object({
  amount: money(100_000_000),
  source: title(60, 'Where is it from?'),
  note: z.string().trim().max(140).nullable().default(null),
  currency,
  receivedAt: timestamp.optional(),
});
export type IncomeEntry = z.output<typeof incomeEntrySchema>;

export const investmentSchema = z.object({
  name: title(80, 'Name the investment'),
  kind: z.enum(INVESTMENT_KINDS),
  investedAmount: z.number().min(0).max(1e12).default(0),
  currentValue: z.number({ error: 'Enter the current value' }).min(0).max(1e12),
  currency,
});
export type InvestmentInput = z.output<typeof investmentSchema>;

/* ───────────── Learning, skills, projects ───────────── */

export const learningResourceSchema = z
  .object({
    kind: z.enum(LEARNING_KINDS),
    title: title(160, 'Add a title'),
    author: z.string().trim().max(120).nullable().default(null),
    status: z.enum(['planned', 'active', 'completed', 'paused']).default('active'),
    progress: z.number().min(0).default(0),
    total: z.number().positive().nullable().default(null),
    unit: z.enum(['pages', 'lessons', 'chapters', 'hours', 'percent']).default('pages'),
    rating: z.number().int().min(1).max(5).nullable().default(null),
    notes: optionalText(4000),
  })
  .refine((r) => r.total === null || r.progress <= r.total, { error: 'Progress can’t exceed the total', path: ['progress'] });
export type LearningResourceInput = z.output<typeof learningResourceSchema>;

export const skillSchema = z.object({
  domain: z.enum(['intellectual', 'career']),
  name: title(80, 'Name the skill'),
  level: z.number().int().min(1).max(5).default(1),
  targetLevel: z.number().int().min(1).max(5).nullable().default(null),
  notes: optionalText(1000),
});
export type SkillInput = z.output<typeof skillSchema>;

export const projectSchema = z.object({
  domain: z.enum(['career', 'entrepreneurship']),
  kind: z.enum(['project', 'idea', 'venture', 'experiment']),
  title: title(120, 'Name it'),
  description: optionalText(2000),
  status: z.enum(['idea', 'active', 'paused', 'completed', 'dropped']).default('active'),
  hypothesis: optionalText(1000),
  outcome: optionalText(2000),
});
export type ProjectInput = z.output<typeof projectSchema>;

/* ───────────── Reflect ───────────── */

export const reflectionSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  periodStart: isoDate,
  mood: z.number().int().min(1).max(5).nullable().default(null),
  energy: z.number().int().min(1).max(5).nullable().default(null),
  responses: z.record(z.string().regex(/^[a-z_]{1,40}$/), z.string().trim().max(4000)).default({}),
  domainRatings: z.partialRecord(domain, z.number().int().min(1).max(5)).default({}),
  goalIds: z.array(z.uuid()).max(20).default([]),
});
export type ReflectionInput = z.output<typeof reflectionSchema>;

/* ───────────── Profile & assistant ───────────── */

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().max(60).nullable(),
    weightUnit: z.enum(['kg', 'lb']),
    currency,
    timezone: z.string().trim().min(1).max(64),
  })
  .partial();
export type ProfileUpdate = z.output<typeof profileUpdateSchema>;

export const chatInputSchema = z
  .string()
  .trim()
  .min(1, { error: 'Type a message' })
  .max(2000, { error: 'Keep messages under 2000 characters' });

/* ───────────── Helpers ───────────── */

/** Parses user-typed decimals, accepting both "78.4" and "78,4". Returns NaN when invalid. */
export function parseDecimal(input: string): number {
  const normalised = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(normalised) || normalised === '' || normalised === '.') return Number.NaN;
  return Number(normalised);
}

/** First error message per field, for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
