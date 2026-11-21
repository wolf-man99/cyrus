import type { z } from 'zod';
import { expenseEntrySchema, newTaskSchema, weightEntrySchema, workoutEntrySchema } from '@/domain/schemas';
import type { Repository } from '@/data/repository';

/**
 * Assistant capability registry — the bridge between Cyrus and the user's data.
 *
 * Design: the model proposes an action (OpenAI tool call) → the client validates the arguments
 * with the same zod schema the UI uses → executes it through the `Repository`, i.e. with the
 * user's own RLS-scoped session. The AI never gets direct database access.
 *
 * Capabilities are declared here so the tool list, validation and execution live in one place.
 * They are all `enabled: false` until the connected-assistant phase ships; nothing calls them yet.
 */
export interface Capability<S extends z.ZodType = z.ZodType> {
  id: string;
  description: string;
  /** Requires the user to confirm before it runs. */
  confirm: boolean;
  enabled: boolean;
  schema?: S;
  execute?: (repo: Repository, args: z.output<S>) => Promise<unknown>;
}

function capability<S extends z.ZodType>(c: Capability<S>): Capability<S> {
  return c;
}

export const CAPABILITIES = [
  capability({
    id: 'log_weight',
    description: 'Record a body-weight measurement.',
    confirm: false,
    enabled: false,
    schema: weightEntrySchema,
    execute: (repo, args) => repo.weight.create(args),
  }),
  capability({
    id: 'log_workout',
    description: 'Record a completed workout.',
    confirm: false,
    enabled: false,
    schema: workoutEntrySchema,
    execute: (repo, args) => repo.workouts.create(args),
  }),
  capability({
    id: 'record_expense',
    description: 'Record an expense.',
    confirm: true,
    enabled: false,
    schema: expenseEntrySchema,
    execute: (repo, args) => repo.transactions.createExpense(args),
  }),
  capability({
    id: 'create_task',
    description: 'Create a task or commitment.',
    confirm: false,
    enabled: false,
    schema: newTaskSchema,
    execute: (repo, args) => repo.tasks.create(args),
  }),
  { id: 'get_personal_overview', description: 'Retrieve tasks, habits and recent logs.', confirm: false, enabled: false },
  { id: 'update_goal', description: 'Update progress on a goal.', confirm: true, enabled: false },
  { id: 'update_habit', description: 'Mark a habit done or create a habit.', confirm: false, enabled: false },
  { id: 'record_reflection', description: 'Save a daily, weekly or monthly reflection.', confirm: true, enabled: false },
  { id: 'analyse_progress', description: 'Summarise progress across life domains.', confirm: false, enabled: false },
  { id: 'plan_day', description: 'Propose a plan for the day from tasks and priorities.', confirm: true, enabled: false },
] satisfies Capability[];
