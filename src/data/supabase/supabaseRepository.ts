import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays } from '@/lib/dates';
import type {
  Goal,
  Habit,
  HabitLog,
  Profile,
  Reflection,
  Task,
  Transaction,
  WeightLog,
  Workout,
} from '@/domain/types';
import type { Repository } from '../repository';

/* Row shapes (snake_case, as stored in Postgres). */
interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  domain: Task['domain'];
  due_date: string | null;
  due_time: string | null;
  is_priority: boolean;
  completed_at: string | null;
  created_at: string;
}
interface HabitRow {
  id: string;
  title: string;
  icon: Habit['icon'];
  domain: Habit['domain'];
  sort_order: number;
  created_at: string;
}

const TASK_COLUMNS = 'id,title,notes,domain,due_date,due_time,is_priority,completed_at,created_at';
const HABIT_COLUMNS = 'id,title,icon,domain,sort_order,created_at';

const toTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  domain: r.domain,
  dueDate: r.due_date,
  // Postgres `time` comes back as HH:MM:SS
  dueTime: r.due_time ? r.due_time.slice(0, 5) : null,
  isPriority: r.is_priority,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});

const toHabit = (r: HabitRow): Habit => ({
  id: r.id,
  title: r.title,
  icon: r.icon,
  domain: r.domain,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

const byTime = (a: Task, b: Task) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99');

/** Throws a readable error for any failed Supabase call. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No data returned');
  return result.data;
}
function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

/**
 * Supabase-backed repository. Every table enforces Row Level Security
 * (`user_id = auth.uid()`), and `user_id` defaults to `auth.uid()` server-side,
 * so the client never sends — and cannot spoof — ownership.
 */
export function createSupabaseRepository(db: SupabaseClient, userId: string): Repository {
  return {
    mode: 'supabase',

    profile: {
      async get(): Promise<Profile> {
        const row = unwrap(
          await db.from('profiles').select('id,display_name,weight_unit,currency').eq('id', userId).single(),
        ) as { id: string; display_name: string | null; weight_unit: 'kg' | 'lb'; currency: string };
        return { id: row.id, displayName: row.display_name, weightUnit: row.weight_unit, currency: row.currency };
      },
    },

    tasks: {
      async listForDay(date) {
        const rows = unwrap(
          await db
            .from('tasks')
            .select(TASK_COLUMNS)
            .or(`due_date.eq.${date},and(due_date.lt.${date},completed_at.is.null)`)
            .order('due_date', { ascending: true })
            .limit(200),
        ) as TaskRow[];
        return rows.map(toTask).sort(byTime);
      },
      async listUpcoming(date, days) {
        const rows = unwrap(
          await db
            .from('tasks')
            .select(TASK_COLUMNS)
            .gt('due_date', date)
            .lte('due_date', addDays(date, days))
            .is('completed_at', null)
            .order('due_date', { ascending: true })
            .order('due_time', { ascending: true, nullsFirst: false })
            .limit(50),
        ) as TaskRow[];
        return rows.map(toTask);
      },
      async create(input) {
        const row = unwrap(
          await db
            .from('tasks')
            .insert({
              title: input.title,
              notes: input.notes,
              domain: input.domain,
              due_date: input.dueDate,
              due_time: input.dueTime,
              is_priority: input.isPriority,
            })
            .select(TASK_COLUMNS)
            .single(),
        ) as TaskRow;
        return toTask(row);
      },
      async setCompleted(id, completed) {
        const row = unwrap(
          await db
            .from('tasks')
            .update({ completed_at: completed ? new Date().toISOString() : null })
            .eq('id', id)
            .select(TASK_COLUMNS)
            .single(),
        ) as TaskRow;
        return toTask(row);
      },
      async remove(id) {
        check(await db.from('tasks').delete().eq('id', id));
      },
    },

    habits: {
      async list() {
        const rows = unwrap(
          await db.from('habits').select(HABIT_COLUMNS).is('archived_at', null).order('sort_order').order('created_at'),
        ) as HabitRow[];
        return rows.map(toHabit);
      },
      async create(input) {
        const row = unwrap(
          await db
            .from('habits')
            .insert({ title: input.title, icon: input.icon, domain: input.domain })
            .select(HABIT_COLUMNS)
            .single(),
        ) as HabitRow;
        return toHabit(row);
      },
      async archive(id) {
        check(await db.from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id));
      },
      async logsBetween(from, to) {
        const rows = unwrap(
          await db.from('habit_logs').select('id,habit_id,log_date').gte('log_date', from).lte('log_date', to),
        ) as { id: string; habit_id: string; log_date: string }[];
        return rows.map((r): HabitLog => ({ id: r.id, habitId: r.habit_id, logDate: r.log_date }));
      },
      async setDone(habitId, date, done) {
        if (done) {
          check(
            await db
              .from('habit_logs')
              .upsert({ habit_id: habitId, log_date: date }, { onConflict: 'habit_id,log_date', ignoreDuplicates: true }),
          );
        } else {
          check(await db.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date));
        }
      },
    },

    weight: {
      async list(limit = 30) {
        const rows = unwrap(
          await db.from('weight_logs').select('id,value,unit,logged_at').order('logged_at', { ascending: false }).limit(limit),
        ) as { id: string; value: number; unit: 'kg' | 'lb'; logged_at: string }[];
        return rows.map((r): WeightLog => ({ id: r.id, value: Number(r.value), unit: r.unit, loggedAt: r.logged_at }));
      },
      async create(input) {
        const r = unwrap(
          await db.from('weight_logs').insert({ value: input.value, unit: input.unit }).select('id,value,unit,logged_at').single(),
        ) as { id: string; value: number; unit: 'kg' | 'lb'; logged_at: string };
        return { id: r.id, value: Number(r.value), unit: r.unit, loggedAt: r.logged_at };
      },
    },

    workouts: {
      async list(limit = 30) {
        const rows = unwrap(
          await db
            .from('workouts')
            .select('id,workout_type,duration_min,intensity,performed_at')
            .order('performed_at', { ascending: false })
            .limit(limit),
        ) as WorkoutRow[];
        return rows.map(toWorkout);
      },
      async create(input) {
        const r = unwrap(
          await db
            .from('workouts')
            .insert({ workout_type: input.workoutType, duration_min: input.durationMin, intensity: input.intensity })
            .select('id,workout_type,duration_min,intensity,performed_at')
            .single(),
        ) as WorkoutRow;
        return toWorkout(r);
      },
    },

    transactions: {
      async list(limit = 50) {
        const rows = unwrap(
          await db
            .from('transactions')
            .select('id,kind,amount,currency,category,note,occurred_at')
            .order('occurred_at', { ascending: false })
            .limit(limit),
        ) as TransactionRow[];
        return rows.map(toTransaction);
      },
      async createExpense(input) {
        const r = unwrap(
          await db
            .from('transactions')
            .insert({ kind: 'expense', amount: input.amount, currency: input.currency, category: input.category, note: input.note })
            .select('id,kind,amount,currency,category,note,occurred_at')
            .single(),
        ) as TransactionRow;
        return toTransaction(r);
      },
    },

    goals: {
      async list(domain) {
        let query = db
          .from('goals')
          .select('id,domain,title,target_value,current_value,unit,target_date,status')
          .neq('status', 'archived')
          .order('created_at', { ascending: true });
        if (domain) query = query.eq('domain', domain);
        const rows = unwrap(await query) as GoalRow[];
        return rows.map(
          (r): Goal => ({
            id: r.id,
            domain: r.domain,
            title: r.title,
            targetValue: r.target_value === null ? null : Number(r.target_value),
            currentValue: Number(r.current_value),
            unit: r.unit,
            targetDate: r.target_date,
            status: r.status,
          }),
        );
      },
    },

    reflections: {
      async list(period, limit = 30) {
        const rows = unwrap(
          await db
            .from('reflections')
            .select('id,period,period_start,mood,energy,responses,updated_at')
            .eq('period', period)
            .order('period_start', { ascending: false })
            .limit(limit),
        ) as ReflectionRow[];
        return rows.map(
          (r): Reflection => ({
            id: r.id,
            period: r.period,
            periodStart: r.period_start,
            mood: r.mood,
            energy: r.energy,
            responses: r.responses,
            updatedAt: r.updated_at,
          }),
        );
      },
    },
  };
}

interface WorkoutRow {
  id: string;
  workout_type: Workout['workoutType'];
  duration_min: number;
  intensity: Workout['intensity'];
  performed_at: string;
}
const toWorkout = (r: WorkoutRow): Workout => ({
  id: r.id,
  workoutType: r.workout_type,
  durationMin: r.duration_min,
  intensity: r.intensity,
  performedAt: r.performed_at,
});

interface TransactionRow {
  id: string;
  kind: 'expense' | 'income';
  amount: number | string;
  currency: string;
  category: string;
  note: string | null;
  occurred_at: string;
}
const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id,
  kind: r.kind,
  amount: Number(r.amount),
  currency: r.currency,
  category: r.category,
  note: r.note,
  occurredAt: r.occurred_at,
});

interface GoalRow {
  id: string;
  domain: Goal['domain'];
  title: string;
  target_value: number | string | null;
  current_value: number | string;
  unit: string | null;
  target_date: string | null;
  status: Goal['status'];
}

interface ReflectionRow {
  id: string;
  period: Reflection['period'];
  period_start: string;
  mood: number | null;
  energy: number | null;
  responses: Record<string, string>;
  updated_at: string;
}
