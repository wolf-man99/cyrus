import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, dayEndTimestamp, dayStartTimestamp } from '@/lib/dates';
import { uid } from '@/lib/id';
import { CARRY_OVER_DAYS } from '@/domain/tasks';
import type {
  ActivityLog,
  Conversation,
  DomainMetric,
  Expense,
  Goal,
  Habit,
  HealthReport,
  Income,
  Investment,
  LearningResource,
  Profile,
  Project,
  Reflection,
  Skill,
  StoredMessage,
  Task,
  WeightLog,
  Workout,
} from '@/domain/types';
import type { DateRange, Repository } from '../repository';

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are mapped field by field below */
type Row = Record<string, any>;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const time = (v: string | null) => (v ? v.slice(0, 5) : null); // Postgres `time` → HH:MM

/* ───────────── Row mappers (snake_case → domain types) ───────────── */

const toTask = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  domain: r.domain,
  dueDate: r.due_date,
  dueTime: time(r.due_time),
  isPriority: r.is_priority,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});
const toHabit = (r: Row): Habit => ({
  id: r.id,
  title: r.title,
  icon: r.icon,
  domain: r.domain,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});
const toGoal = (r: Row): Goal => ({
  id: r.id,
  domain: r.domain,
  title: r.title,
  description: r.description,
  category: r.category,
  startValue: num(r.start_value),
  targetValue: num(r.target_value),
  currentValue: Number(r.current_value),
  unit: r.unit,
  targetDate: r.target_date,
  status: r.status,
  createdAt: r.created_at,
});
const toMetric = (r: Row): DomainMetric => ({
  id: r.id,
  domain: r.domain,
  metric: r.metric,
  value: Number(r.value),
  unit: r.unit,
  note: r.note,
  recordedAt: r.recorded_at,
});
const toActivity = (r: Row): ActivityLog => ({
  id: r.id,
  domain: r.domain,
  kind: r.kind,
  title: r.title,
  value: num(r.value),
  unit: r.unit,
  notes: r.notes,
  details: r.details ?? {},
  goalId: r.goal_id,
  occurredAt: r.occurred_at,
});
const toWeight = (r: Row): WeightLog => ({ id: r.id, value: Number(r.value), unit: r.unit, loggedAt: r.logged_at });
const toWorkout = (r: Row): Workout => ({
  id: r.id,
  workoutType: r.workout_type,
  durationMin: r.duration_min,
  intensity: r.intensity,
  notes: r.notes,
  exercises: r.exercises ?? [],
  performedAt: r.performed_at,
});
const toExpense = (r: Row): Expense => ({
  id: r.id,
  amount: Number(r.amount),
  currency: r.currency,
  category: r.category,
  note: r.note,
  occurredAt: r.occurred_at,
});
const toIncome = (r: Row): Income => ({
  id: r.id,
  amount: Number(r.amount),
  currency: r.currency,
  source: r.source,
  note: r.note,
  receivedAt: r.received_at,
});
const toInvestment = (r: Row): Investment => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  investedAmount: Number(r.invested_amount),
  currentValue: Number(r.current_value),
  currency: r.currency,
  valueUpdatedAt: r.value_updated_at,
});
const toLearning = (r: Row): LearningResource => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  author: r.author,
  status: r.status,
  progress: Number(r.progress),
  total: num(r.total),
  unit: r.unit,
  rating: r.rating,
  notes: r.notes,
  startedAt: r.started_at,
  completedAt: r.completed_at,
  updatedAt: r.updated_at,
});
const toSkill = (r: Row): Skill => ({
  id: r.id,
  domain: r.domain,
  name: r.name,
  level: r.level,
  targetLevel: r.target_level,
  notes: r.notes,
  updatedAt: r.updated_at,
});
const toProject = (r: Row): Project => ({
  id: r.id,
  domain: r.domain,
  kind: r.kind,
  title: r.title,
  description: r.description,
  status: r.status,
  hypothesis: r.hypothesis,
  outcome: r.outcome,
  startedAt: r.started_at,
  completedAt: r.completed_at,
  updatedAt: r.updated_at,
});
const toReport = (r: Row): HealthReport => ({
  id: r.id,
  title: r.title,
  storagePath: r.storage_path,
  fileName: r.file_name,
  mimeType: r.mime_type,
  sizeBytes: num(r.size_bytes),
  reportDate: r.report_date,
  notes: r.notes,
  createdAt: r.created_at,
});
const toReflection = (r: Row): Reflection => ({
  id: r.id,
  period: r.period,
  periodStart: r.period_start,
  mood: r.mood,
  energy: r.energy,
  responses: r.responses ?? {},
  domainRatings: r.domain_ratings ?? {},
  goalIds: (r.reflection_goals ?? []).map((l: Row) => l.goal_id),
  updatedAt: r.updated_at,
});
const toConversation = (r: Row): Conversation => ({
  id: r.id,
  title: r.title,
  startedAt: r.started_at,
  updatedAt: r.updated_at,
  endedAt: r.ended_at,
});
const toMessage = (r: Row): StoredMessage => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role,
  content: r.content,
  actions: r.actions ?? [],
  createdAt: r.created_at,
});

/** Removes keys whose value is undefined, so partial updates only touch what changed. */
function defined(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}

/** Throws a readable error for a failed Supabase call. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No data returned');
  return result.data;
}
function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

/** Escapes LIKE wildcards in user input. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const REPORTS_BUCKET = 'health-reports';

/**
 * Supabase-backed repository. Every table enforces Row Level Security
 * (`user_id = auth.uid()`), and `user_id` defaults to `auth.uid()` server-side,
 * so the client never sends — and cannot spoof — ownership.
 */
export function createSupabaseRepository(db: SupabaseClient, userId: string): Repository {
  /** Applies an inclusive local-date range to a timestamp column. */
  function ranged<Q extends { gte: any; lt: any; limit: any }>(query: Q, column: string, range?: DateRange): Q {
    let q = query;
    if (range?.from) q = q.gte(column, dayStartTimestamp(range.from));
    if (range?.to) q = q.lt(column, dayEndTimestamp(range.to));
    if (range?.limit) q = q.limit(range.limit);
    return q;
  }

  /** A log table: list newest first, insert, delete. */
  function logStore<T>(table: string, column: string, map: (r: Row) => T, toRow: (input: any) => Row) {
    return {
      async list(range?: DateRange): Promise<T[]> {
        const rows = unwrap(
          await ranged(db.from(table).select('*').order(column, { ascending: false }), column, { limit: 500, ...range }),
        ) as Row[];
        return rows.map(map);
      },
      async create(input: any): Promise<T> {
        return map(unwrap(await db.from(table).insert(defined(toRow(input))).select('*').single()) as Row);
      },
      async remove(id: string): Promise<void> {
        check(await db.from(table).delete().eq('id', id));
      },
    };
  }

  return {
    mode: 'supabase',

    profile: {
      async get(): Promise<Profile> {
        const r = unwrap(await db.from('profiles').select('*').eq('id', userId).single()) as Row;
        return { id: r.id, displayName: r.display_name, weightUnit: r.weight_unit, currency: r.currency, timezone: r.timezone };
      },
      async update(patch) {
        const r = unwrap(
          await db
            .from('profiles')
            .update(
              defined({
                display_name: patch.displayName,
                weight_unit: patch.weightUnit,
                currency: patch.currency,
                timezone: patch.timezone,
              }),
            )
            .eq('id', userId)
            .select('*')
            .single(),
        ) as Row;
        return { id: r.id, displayName: r.display_name, weightUnit: r.weight_unit, currency: r.currency, timezone: r.timezone };
      },
    },

    tasks: {
      async listForDay(date) {
        const oldest = addDays(date, -CARRY_OVER_DAYS);
        const rows = unwrap(
          await db
            .from('tasks')
            .select('*')
            .or(`due_date.eq.${date},and(due_date.lt.${date},due_date.gte.${oldest},completed_at.is.null)`)
            .limit(200),
        ) as Row[];
        return rows.map(toTask).sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99'));
      },
      async listUpcoming(date, days) {
        const rows = unwrap(
          await db
            .from('tasks')
            .select('*')
            .gt('due_date', date)
            .lte('due_date', addDays(date, days))
            .is('completed_at', null)
            .order('due_date')
            .order('due_time', { nullsFirst: false })
            .limit(50),
        ) as Row[];
        return rows.map(toTask);
      },
      async listBetween(from, to) {
        const rows = unwrap(
          await db.from('tasks').select('*').gte('due_date', from).lte('due_date', to).order('due_date').limit(500),
        ) as Row[];
        return rows.map(toTask);
      },
      async search(query, limit = 20) {
        const rows = unwrap(
          await db
            .from('tasks')
            .select('*')
            .ilike('title', `%${likeEscape(query.trim())}%`)
            .order('completed_at', { nullsFirst: true })
            .order('due_date', { ascending: false })
            .limit(limit),
        ) as Row[];
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
            .select('*')
            .single(),
        ) as Row;
        return toTask(row);
      },
      async update(id, patch) {
        const row = unwrap(
          await db
            .from('tasks')
            .update(
              defined({
                title: patch.title,
                notes: patch.notes,
                domain: patch.domain,
                due_date: patch.dueDate,
                due_time: patch.dueTime,
                is_priority: patch.isPriority,
              }),
            )
            .eq('id', id)
            .select('*')
            .single(),
        ) as Row;
        return toTask(row);
      },
      async setCompleted(id, completed) {
        const row = unwrap(
          await db
            .from('tasks')
            .update({ completed_at: completed ? new Date().toISOString() : null })
            .eq('id', id)
            .select('*')
            .single(),
        ) as Row;
        return toTask(row);
      },
      async remove(id) {
        check(await db.from('tasks').delete().eq('id', id));
      },
    },

    habits: {
      async list() {
        const rows = unwrap(
          await db.from('habits').select('*').is('archived_at', null).order('sort_order').order('created_at'),
        ) as Row[];
        return rows.map(toHabit);
      },
      async create(input) {
        return toHabit(
          unwrap(
            await db.from('habits').insert({ title: input.title, icon: input.icon, domain: input.domain }).select('*').single(),
          ) as Row,
        );
      },
      async archive(id) {
        check(await db.from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id));
      },
      async logsBetween(from, to) {
        const rows = unwrap(
          await db.from('habit_logs').select('id,habit_id,log_date').gte('log_date', from).lte('log_date', to),
        ) as Row[];
        return rows.map((r) => ({ id: r.id, habitId: r.habit_id, logDate: r.log_date }));
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

    goals: {
      async list(filter) {
        let q = db.from('goals').select('*').order('created_at');
        if (filter?.domain) q = q.eq('domain', filter.domain);
        if (!filter?.includeArchived) q = q.neq('status', 'archived');
        return (unwrap(await q) as Row[]).map(toGoal);
      },
      async create(input) {
        return toGoal(
          unwrap(
            await db
              .from('goals')
              .insert({
                domain: input.domain,
                title: input.title,
                description: input.description,
                category: input.category,
                start_value: input.startValue,
                target_value: input.targetValue,
                current_value: input.currentValue,
                unit: input.unit,
                target_date: input.targetDate,
              })
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async update(id, patch) {
        return toGoal(
          unwrap(
            await db
              .from('goals')
              .update(
                defined({
                  title: patch.title,
                  description: patch.description,
                  category: patch.category,
                  start_value: patch.startValue,
                  target_value: patch.targetValue,
                  current_value: patch.currentValue,
                  unit: patch.unit,
                  target_date: patch.targetDate,
                  status: patch.status,
                  archived_at: patch.status === undefined ? undefined : patch.status === 'archived' ? new Date().toISOString() : null,
                }),
              )
              .eq('id', id)
              .select('*')
              .single(),
          ) as Row,
        );
      },
    },

    metrics: {
      async list(filter) {
        let q = db.from('domain_metrics').select('*').order('recorded_at', { ascending: false });
        if (filter?.domain) q = q.eq('domain', filter.domain);
        if (filter?.metrics) q = q.in('metric', filter.metrics);
        return (unwrap(await ranged(q, 'recorded_at', { limit: 1000, ...filter })) as Row[]).map(toMetric);
      },
      async record(input) {
        return toMetric(
          unwrap(
            await db
              .from('domain_metrics')
              .insert(
                defined({
                  domain: input.domain,
                  metric: input.metric,
                  value: input.value,
                  unit: input.unit,
                  note: input.note,
                  recorded_at: input.recordedAt,
                }),
              )
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async remove(id) {
        check(await db.from('domain_metrics').delete().eq('id', id));
      },
    },

    activities: {
      async list(filter) {
        let q = db.from('activity_logs').select('*').order('occurred_at', { ascending: false });
        if (filter?.domain) q = q.eq('domain', filter.domain);
        if (filter?.kinds) q = q.in('kind', filter.kinds);
        if (filter?.goalId) q = q.eq('goal_id', filter.goalId);
        return (unwrap(await ranged(q, 'occurred_at', { limit: 500, ...filter })) as Row[]).map(toActivity);
      },
      async create(input) {
        return toActivity(
          unwrap(
            await db
              .from('activity_logs')
              .insert(
                defined({
                  domain: input.domain,
                  kind: input.kind,
                  title: input.title,
                  value: input.value,
                  unit: input.unit,
                  notes: input.notes,
                  details: input.details,
                  goal_id: input.goalId,
                  occurred_at: input.occurredAt,
                }),
              )
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async remove(id) {
        check(await db.from('activity_logs').delete().eq('id', id));
      },
    },

    weight: logStore('weight_logs', 'logged_at', toWeight, (i) => ({ value: i.value, unit: i.unit })),
    workouts: logStore('workouts', 'performed_at', toWorkout, (i) => ({
      workout_type: i.workoutType,
      duration_min: i.durationMin,
      intensity: i.intensity,
      notes: i.notes,
      exercises: i.exercises,
    })),
    expenses: logStore('expenses', 'occurred_at', toExpense, (i) => ({
      amount: i.amount,
      currency: i.currency,
      category: i.category,
      note: i.note,
      occurred_at: i.occurredAt,
    })),
    income: logStore('income', 'received_at', toIncome, (i) => ({
      amount: i.amount,
      currency: i.currency,
      source: i.source,
      note: i.note,
      received_at: i.receivedAt,
    })),

    investments: {
      async list() {
        const rows = unwrap(
          await db.from('investments').select('*').is('archived_at', null).order('current_value', { ascending: false }),
        ) as Row[];
        return rows.map(toInvestment);
      },
      async create(i) {
        return toInvestment(
          unwrap(
            await db
              .from('investments')
              .insert({ name: i.name, kind: i.kind, invested_amount: i.investedAmount, current_value: i.currentValue, currency: i.currency })
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async update(id, p) {
        return toInvestment(
          unwrap(
            await db
              .from('investments')
              .update(
                defined({
                  name: p.name,
                  kind: p.kind,
                  invested_amount: p.investedAmount,
                  current_value: p.currentValue,
                  currency: p.currency,
                  value_updated_at: p.currentValue !== undefined ? new Date().toISOString() : undefined,
                }),
              )
              .eq('id', id)
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async archive(id) {
        check(await db.from('investments').update({ archived_at: new Date().toISOString() }).eq('id', id));
      },
    },

    learning: {
      async list() {
        return (unwrap(await db.from('learning_resources').select('*').order('updated_at', { ascending: false })) as Row[]).map(
          toLearning,
        );
      },
      async create(i) {
        const today = new Date().toISOString().slice(0, 10);
        return toLearning(
          unwrap(
            await db
              .from('learning_resources')
              .insert({
                kind: i.kind,
                title: i.title,
                author: i.author,
                status: i.status,
                progress: i.progress,
                total: i.total,
                unit: i.unit,
                rating: i.rating,
                notes: i.notes,
                started_at: i.status === 'active' ? today : null,
                completed_at: i.status === 'completed' ? today : null,
              })
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async update(id, p) {
        const today = new Date().toISOString().slice(0, 10);
        return toLearning(
          unwrap(
            await db
              .from('learning_resources')
              .update(
                defined({
                  kind: p.kind,
                  title: p.title,
                  author: p.author,
                  status: p.status,
                  progress: p.progress,
                  total: p.total,
                  unit: p.unit,
                  rating: p.rating,
                  notes: p.notes,
                  completed_at: p.status === 'completed' ? today : undefined,
                }),
              )
              .eq('id', id)
              .select('*')
              .single(),
          ) as Row,
        );
      },
    },

    skills: {
      async list(domain) {
        let q = db.from('skills').select('*').is('archived_at', null).order('created_at');
        if (domain) q = q.eq('domain', domain);
        return (unwrap(await q) as Row[]).map(toSkill);
      },
      async create(i) {
        return toSkill(
          unwrap(
            await db
              .from('skills')
              .insert({ domain: i.domain, name: i.name, level: i.level, target_level: i.targetLevel, notes: i.notes })
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async update(id, p) {
        return toSkill(
          unwrap(
            await db
              .from('skills')
              .update(defined({ name: p.name, level: p.level, target_level: p.targetLevel, notes: p.notes }))
              .eq('id', id)
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async archive(id) {
        check(await db.from('skills').update({ archived_at: new Date().toISOString() }).eq('id', id));
      },
    },

    projects: {
      async list(domain) {
        let q = db.from('projects').select('*').order('updated_at', { ascending: false });
        if (domain) q = q.eq('domain', domain);
        return (unwrap(await q) as Row[]).map(toProject);
      },
      async create(i) {
        const today = new Date().toISOString().slice(0, 10);
        return toProject(
          unwrap(
            await db
              .from('projects')
              .insert({
                domain: i.domain,
                kind: i.kind,
                title: i.title,
                description: i.description,
                status: i.status,
                hypothesis: i.hypothesis,
                outcome: i.outcome,
                started_at: i.status === 'active' ? today : null,
              })
              .select('*')
              .single(),
          ) as Row,
        );
      },
      async update(id, p) {
        const today = new Date().toISOString().slice(0, 10);
        return toProject(
          unwrap(
            await db
              .from('projects')
              .update(
                defined({
                  kind: p.kind,
                  title: p.title,
                  description: p.description,
                  status: p.status,
                  hypothesis: p.hypothesis,
                  outcome: p.outcome,
                  completed_at: p.status === 'completed' ? today : undefined,
                }),
              )
              .eq('id', id)
              .select('*')
              .single(),
          ) as Row,
        );
      },
    },

    healthReports: {
      async list() {
        return (unwrap(await db.from('health_reports').select('*').order('created_at', { ascending: false })) as Row[]).map(
          toReport,
        );
      },
      async upload(file, meta) {
        const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'report';
        // The first folder must be the user's id — storage policies enforce it.
        const path = `${userId}/${uid()}-${safeName}`;
        check(await db.storage.from(REPORTS_BUCKET).upload(path, file, { contentType: file.type, upsert: false }));
        const inserted = await db
          .from('health_reports')
          .insert({
            title: meta.title,
            report_date: meta.reportDate,
            notes: meta.notes,
            storage_path: path,
            file_name: file.name.slice(0, 255),
            mime_type: file.type,
            size_bytes: file.size,
          })
          .select('*')
          .single();
        if (inserted.error) {
          // Don't leave an orphaned file behind.
          await db.storage.from(REPORTS_BUCKET).remove([path]);
          throw new Error(inserted.error.message);
        }
        return toReport(inserted.data as Row);
      },
      async fileUrl(report) {
        const { data, error } = await db.storage.from(REPORTS_BUCKET).createSignedUrl(report.storagePath, 300);
        if (error || !data) throw new Error(error?.message ?? 'Could not open the file');
        return data.signedUrl;
      },
      async remove(report) {
        check(await db.storage.from(REPORTS_BUCKET).remove([report.storagePath]));
        check(await db.from('health_reports').delete().eq('id', report.id));
      },
    },

    reflections: {
      async list(period, limit = 60) {
        let q = db.from('reflections').select('*, reflection_goals(goal_id)').order('period_start', { ascending: false }).limit(limit);
        if (period) q = q.eq('period', period);
        return (unwrap(await q) as Row[]).map(toReflection);
      },
      async get(period, start) {
        const { data, error } = await db
          .from('reflections')
          .select('*, reflection_goals(goal_id)')
          .eq('period', period)
          .eq('period_start', start)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? toReflection(data as Row) : null;
      },
      async save(input) {
        const row = unwrap(
          await db
            .from('reflections')
            .upsert(
              {
                user_id: userId,
                period: input.period,
                period_start: input.periodStart,
                mood: input.mood,
                energy: input.energy,
                responses: input.responses,
                domain_ratings: input.domainRatings,
              },
              { onConflict: 'user_id,period,period_start' },
            )
            .select('*')
            .single(),
        ) as Row;
        check(await db.from('reflection_goals').delete().eq('reflection_id', row.id));
        if (input.goalIds.length) {
          check(await db.from('reflection_goals').insert(input.goalIds.map((goal_id) => ({ reflection_id: row.id, goal_id }))));
        }
        return toReflection({ ...row, reflection_goals: input.goalIds.map((goal_id) => ({ goal_id })) });
      },
    },

    conversations: {
      async list(limit = 20) {
        return (
          unwrap(await db.from('conversations').select('*').order('updated_at', { ascending: false }).limit(limit)) as Row[]
        ).map(toConversation);
      },
      async create(title = null) {
        return toConversation(unwrap(await db.from('conversations').insert({ title }).select('*').single()) as Row);
      },
      async messages(conversationId, limit = 100) {
        const rows = unwrap(
          await db
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(limit),
        ) as Row[];
        return rows.map(toMessage).reverse();
      },
      async append(conversationId, message) {
        const row = unwrap(
          await db
            .from('messages')
            .insert({ conversation_id: conversationId, role: message.role, content: message.content, actions: message.actions ?? [] })
            .select('*')
            .single(),
        ) as Row;
        if (message.role === 'user') {
          // Name the conversation after its first question.
          await db.from('conversations').update({ title: message.content.slice(0, 80) }).eq('id', conversationId).is('title', null);
        }
        return toMessage(row);
      },
      async end(conversationId) {
        check(await db.from('conversations').update({ ended_at: new Date().toISOString() }).eq('id', conversationId));
      },
    },
  };
}
