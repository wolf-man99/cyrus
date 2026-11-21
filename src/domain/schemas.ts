import { z } from 'zod';
import { EXPENSE_CATEGORIES, HABIT_ICONS, LIFE_DOMAINS, WORKOUT_TYPES } from './types';

/**
 * Input validation for everything a user can write.
 * The same rules are enforced again in Postgres via CHECK constraints.
 */

const domain = z.enum(LIFE_DOMAINS).nullable();
const isoDate = z.iso.date({ error: 'Choose a valid date' });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Choose a valid time' });

export const newTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Give the task a name' })
    .max(200, { error: 'Keep it under 200 characters' }),
  notes: z.string().trim().max(2000).nullable().default(null),
  domain: domain.default(null),
  dueDate: isoDate.nullable(),
  dueTime: hhmm.nullable().default(null),
  isPriority: z.boolean().default(false),
});
export type NewTaskInput = z.input<typeof newTaskSchema>;
export type NewTask = z.output<typeof newTaskSchema>;

export const newHabitSchema = z.object({
  title: z.string().trim().min(1, { error: 'Name your habit' }).max(60, { error: 'Keep it under 60 characters' }),
  icon: z.enum(HABIT_ICONS),
  domain: domain.default(null),
});
export type NewHabit = z.output<typeof newHabitSchema>;

export const weightEntrySchema = z.object({
  value: z
    .number({ error: 'Enter your weight' })
    .positive({ error: 'Enter your weight' })
    .lt(1000, { error: 'That looks too high' })
    .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6, { error: 'Use at most one decimal place' }),
  unit: z.enum(['kg', 'lb']),
});
export type WeightEntry = z.output<typeof weightEntrySchema>;

export const workoutEntrySchema = z.object({
  workoutType: z.enum(WORKOUT_TYPES, { error: 'Pick a workout type' }),
  durationMin: z
    .number({ error: 'Enter a duration' })
    .int({ error: 'Use whole minutes' })
    .min(1, { error: 'Enter a duration' })
    .max(600, { error: 'Keep it under 10 hours' }),
  intensity: z.enum(['easy', 'moderate', 'hard']).nullable().default(null),
});
export type WorkoutEntry = z.output<typeof workoutEntrySchema>;

export const expenseEntrySchema = z.object({
  amount: z
    .number({ error: 'Enter an amount' })
    .positive({ error: 'Enter an amount' })
    .max(1_000_000, { error: 'That looks too high' })
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, { error: 'Use at most two decimals' }),
  category: z.enum(EXPENSE_CATEGORIES, { error: 'Pick a category' }),
  note: z.string().trim().max(140, { error: 'Keep the note short' }).nullable().default(null),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export type ExpenseEntry = z.output<typeof expenseEntrySchema>;

export const chatInputSchema = z
  .string()
  .trim()
  .min(1, { error: 'Type a message' })
  .max(2000, { error: 'Keep messages under 2000 characters' });

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
