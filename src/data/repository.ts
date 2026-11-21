import type { ISODate } from '@/lib/dates';
import type {
  Goal,
  Habit,
  HabitLog,
  LifeDomain,
  Profile,
  Reflection,
  ReflectionPeriod,
  Task,
  Transaction,
  WeightLog,
  Workout,
} from '@/domain/types';
import type { ExpenseEntry, NewHabit, NewTask, WeightEntry, WorkoutEntry } from '@/domain/schemas';

/**
 * The persistence contract for CYRUS.
 *
 * Two implementations exist:
 *  - `SupabaseRepository` — real, per-user data protected by Row Level Security.
 *  - `DemoRepository`     — in-memory sample data. Nothing is persisted; it resets on reload.
 *
 * UI code depends only on this interface (via the React Query hooks in `data/hooks`).
 */
export interface Repository {
  readonly mode: 'demo' | 'supabase';

  profile: {
    get(): Promise<Profile>;
  };

  tasks: {
    /** Tasks due on `date`, plus incomplete tasks carried over from earlier days. */
    listForDay(date: ISODate): Promise<Task[]>;
    /** Incomplete tasks due after `date`, up to `days` ahead. */
    listUpcoming(date: ISODate, days: number): Promise<Task[]>;
    create(input: NewTask): Promise<Task>;
    setCompleted(id: string, completed: boolean): Promise<Task>;
    remove(id: string): Promise<void>;
  };

  habits: {
    list(): Promise<Habit[]>;
    create(input: NewHabit): Promise<Habit>;
    archive(id: string): Promise<void>;
    /** Completion logs between two dates (inclusive). Used for today's state and streaks. */
    logsBetween(from: ISODate, to: ISODate): Promise<HabitLog[]>;
    setDone(habitId: string, date: ISODate, done: boolean): Promise<void>;
  };

  weight: {
    list(limit?: number): Promise<WeightLog[]>;
    create(input: WeightEntry): Promise<WeightLog>;
  };

  workouts: {
    list(limit?: number): Promise<Workout[]>;
    create(input: WorkoutEntry): Promise<Workout>;
  };

  transactions: {
    list(limit?: number): Promise<Transaction[]>;
    createExpense(input: ExpenseEntry): Promise<Transaction>;
  };

  /* ── Prepared for the Track & Reflect build phases ── */

  goals: {
    list(domain?: LifeDomain): Promise<Goal[]>;
  };

  reflections: {
    list(period: ReflectionPeriod, limit?: number): Promise<Reflection[]>;
  };
}
