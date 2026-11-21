import { z } from 'zod';
import type { Repository } from '@/data/repository';
import { LIFE_DOMAINS, EXPENSE_CATEGORIES, WORKOUT_TYPES, type LifeDomain } from '@/domain/types';
import {
  activityEntrySchema,
  expenseEntrySchema,
  goalUpdateSchema,
  incomeEntrySchema,
  metricEntrySchema,
  newGoalSchema,
  newTaskSchema,
  reflectionSchema,
  taskUpdateSchema,
  weightEntrySchema,
  workoutEntrySchema,
} from '@/domain/schemas';
import { goalProgress } from '@/domain/goals';
import { withHabitState } from '@/domain/habits';
import { dailyProgress } from '@/domain/progress';
import { netWorth } from '@/domain/finance';
import { summarizePeriod } from '@/domain/summary';
import { trend } from '@/domain/series';
import { logLearningProgress } from '@/data/operations';
import {
  addDays,
  addMonths,
  dateOf,
  endOfMonth,
  periodStart,
  startOfMonth,
  startOfWeek,
  type ISODate,
} from '@/lib/dates';
import type { ToolSpec } from './types';

/**
 * The assistant's capabilities. Each tool declares its arguments (zod → JSON Schema for the
 * model), whether it changes data, whether it needs the user's confirmation, and how it runs —
 * always through the Repository, i.e. with the signed-in user's own permissions.
 */
export interface ToolContext {
  today: ISODate;
  currency: string;
  weightUnit: 'kg' | 'lb';
}

export interface ToolOutcome {
  /** JSON-serialisable result returned to the model. */
  result: unknown;
  /** Human-readable receipt for data changes, e.g. "Logged 91.5 kg". */
  summary?: string;
}

export interface ToolDefinition<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  mutates: boolean;
  /** Consequential or hard-to-undo changes wait for an explicit yes from the user. */
  confirm?: boolean;
  /** One line describing what will happen, shown before confirming. */
  describe?: (args: z.output<S>, ctx: ToolContext) => string;
  run(repo: Repository, args: z.output<S>, ctx: ToolContext): Promise<ToolOutcome>;
}

function tool<S extends z.ZodType>(def: ToolDefinition<S>): ToolDefinition<S> {
  return def;
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Local date, YYYY-MM-DD');
const domain = z.enum(LIFE_DOMAINS);
const cap = <T>(items: T[], n: number) => items.slice(0, n);
const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
};

/** Validates through the app's own input schema so the assistant obeys the same rules as the UI. */
function strict<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ToolInputError(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '));
  return parsed.data;
}

export class ToolInputError extends Error {}

type PeriodName = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days' | 'last_90_days';
const PERIODS = ['today', 'this_week', 'last_week', 'this_month', 'last_month', 'last_7_days', 'last_30_days', 'last_90_days'] as const;

function resolvePeriod(period: PeriodName, today: ISODate): { from: ISODate; to: ISODate } {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'this_week':
      return { from: startOfWeek(today), to: today };
    case 'last_week': {
      const from = addDays(startOfWeek(today), -7);
      return { from, to: addDays(from, 6) };
    }
    case 'this_month':
      return { from: startOfMonth(today), to: today };
    case 'last_month': {
      const from = addMonths(startOfMonth(today), -1);
      return { from, to: endOfMonth(from) };
    }
    case 'last_7_days':
      return { from: addDays(today, -6), to: today };
    case 'last_30_days':
      return { from: addDays(today, -29), to: today };
    case 'last_90_days':
      return { from: addDays(today, -89), to: today };
  }
}

const METRIC_DOMAIN: Record<string, LifeDomain> = {
  mood: 'mental',
  energy: 'mental',
  waist: 'physical',
  chest: 'physical',
  hips: 'physical',
  arm: 'physical',
  thigh: 'physical',
  neck: 'physical',
  body_fat: 'physical',
  savings_balance: 'financial',
  debt_balance: 'financial',
};

export const TOOLS = [
  /* ───────────── Retrieval ───────────── */
  tool({
    name: 'get_today',
    description: "Today's tasks (with ids), habits with streaks, and the day's progress.",
    schema: z.object({}),
    mutates: false,
    async run(repo, _args, ctx) {
      const [tasks, habits, logs] = await Promise.all([
        repo.tasks.listForDay(ctx.today),
        repo.habits.list(),
        repo.habits.logsBetween(addDays(ctx.today, -60), ctx.today),
      ]);
      const withState = withHabitState(habits, logs, ctx.today);
      const progress = dailyProgress(tasks, withState);
      return {
        result: {
          date: ctx.today,
          progress: { done: progress.done, total: progress.total },
          tasks: tasks.map((t) => ({ id: t.id, title: t.title, done: !!t.completedAt, priority: t.isPriority, due: t.dueDate, time: t.dueTime, domain: t.domain })),
          habits: withState.map((h) => ({ id: h.id, title: h.title, doneToday: h.doneToday, streakDays: h.streak })),
        },
      };
    },
  }),
  tool({
    name: 'find_tasks',
    description: 'Search tasks by words in the title, or list tasks due in a date range. Returns ids for updating.',
    schema: z.object({
      query: z.string().max(100).optional().describe('Words from the task title'),
      from: date.optional(),
      to: date.optional(),
      status: z.enum(['open', 'done', 'any']).default('any'),
    }),
    mutates: false,
    async run(repo, a, ctx) {
      let tasks = a.query ? await repo.tasks.search(a.query, 25) : await repo.tasks.listBetween(a.from ?? addDays(ctx.today, -7), a.to ?? addDays(ctx.today, 14));
      if (a.status !== 'any') tasks = tasks.filter((t) => (a.status === 'done' ? t.completedAt : !t.completedAt));
      return { result: cap(tasks, 25).map((t) => ({ id: t.id, title: t.title, due: t.dueDate, time: t.dueTime, done: !!t.completedAt, priority: t.isPriority, domain: t.domain })) };
    },
  }),
  tool({
    name: 'get_goals',
    description: 'Goals with progress, optionally for one life domain.',
    schema: z.object({ domain: domain.optional(), status: z.enum(['active', 'completed', 'archived', 'all']).default('active') }),
    mutates: false,
    async run(repo, a) {
      const goals = await repo.goals.list({ domain: a.domain, includeArchived: a.status === 'archived' || a.status === 'all' });
      return {
        result: goals
          .filter((g) => a.status === 'all' || (a.status === 'active' ? g.status === 'active' || g.status === 'paused' : g.status === a.status))
          .map((g) => {
            const p = goalProgress(g);
            return { id: g.id, domain: g.domain, title: g.title, status: g.status, start: g.startValue, current: g.currentValue, target: g.targetValue, unit: g.unit, targetDate: g.targetDate, progressPercent: p === null ? null : Math.round(p * 100) };
          }),
      };
    },
  }),
  tool({
    name: 'get_weight',
    description: 'Weight entries and trend over the last N days.',
    schema: z.object({ days: z.number().int().min(7).max(365).default(90) }),
    mutates: false,
    async run(repo, a, ctx) {
      const logs = await repo.weight.list({ from: addDays(ctx.today, -(a.days - 1)), to: ctx.today });
      const series = [...logs].reverse().map((l) => ({ date: dateOf(l.loggedAt), value: l.value }));
      const t = trend(series);
      return {
        result: {
          latest: logs[0] ? { value: logs[0].value, unit: logs[0].unit, date: dateOf(logs[0].loggedAt) } : null,
          trend: t && { first: t.first, last: t.last, change: r2(t.change), min: t.min, max: t.max, entries: t.count },
          entries: cap(series.reverse(), 30),
        },
      };
    },
  }),
  tool({
    name: 'get_workouts',
    description: 'Workouts in the last N days with counts, minutes and weekly consistency.',
    schema: z.object({ days: z.number().int().min(7).max(365).default(30) }),
    mutates: false,
    async run(repo, a, ctx) {
      const list = await repo.workouts.list({ from: addDays(ctx.today, -(a.days - 1)), to: ctx.today });
      const weeks = new Map<string, number>();
      for (const w of list) weeks.set(startOfWeek(dateOf(w.performedAt)), (weeks.get(startOfWeek(dateOf(w.performedAt))) ?? 0) + 1);
      return {
        result: {
          count: list.length,
          minutes: list.reduce((s, w) => s + w.durationMin, 0),
          perWeek: [...weeks.entries()].sort().map(([week, count]) => ({ week, count })),
          recent: cap(list, 15).map((w) => ({ date: dateOf(w.performedAt), type: w.workoutType, minutes: w.durationMin, intensity: w.intensity, exercises: w.exercises })),
        },
      };
    },
  }),
  tool({
    name: 'get_finances',
    description: 'Spending, income, net and spending by category for a period, compared with the previous period. Also net worth.',
    schema: z.object({ period: z.enum(PERIODS).default('this_month'), from: date.optional(), to: date.optional() }),
    mutates: false,
    async run(repo, a, ctx) {
      const range = a.from && a.to ? { from: a.from, to: a.to } : resolvePeriod(a.period, ctx.today);
      const days = Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000) + 1;
      const prev = { from: addDays(range.from, -days), to: addDays(range.from, -1) };
      const [expenses, income, prevExpenses, investments, balances] = await Promise.all([
        repo.expenses.list(range),
        repo.income.list(range),
        repo.expenses.list(prev),
        repo.investments.list(),
        repo.metrics.list({ domain: 'financial', limit: 20 }),
      ]);
      const sum = (xs: { amount: number }[]) => r2(xs.reduce((s, x) => s + x.amount, 0));
      const cats = new Map<string, number>();
      for (const e of expenses) cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
      const worth = netWorth(investments, balances);
      return {
        result: {
          currency: ctx.currency,
          range,
          spent: sum(expenses),
          earned: sum(income),
          net: r2(sum(income) - sum(expenses)),
          spentPreviousPeriod: sum(prevExpenses),
          byCategory: [...cats.entries()].sort((x, y) => y[1] - x[1]).map(([category, total]) => ({ category, total: r2(total) })),
          largestExpenses: cap([...expenses].sort((x, y) => y.amount - x.amount), 5).map((e) => ({ date: dateOf(e.occurredAt), amount: e.amount, category: e.category, note: e.note })),
          netWorth: worth,
        },
      };
    },
  }),
  tool({
    name: 'get_habits',
    description: 'Habit completion rates and streaks over the last N days.',
    schema: z.object({ days: z.number().int().min(3).max(90).default(14) }),
    mutates: false,
    async run(repo, a, ctx) {
      const from = addDays(ctx.today, -(a.days - 1));
      const [habits, logs] = await Promise.all([repo.habits.list(), repo.habits.logsBetween(addDays(ctx.today, -60), ctx.today)]);
      const state = withHabitState(habits, logs, ctx.today);
      return {
        result: state.map((h) => {
          const done = logs.filter((l) => l.habitId === h.id && l.logDate >= from).length;
          return { id: h.id, title: h.title, doneToday: h.doneToday, streakDays: h.streak, daysDone: done, ofDays: a.days, rate: r2(done / a.days) };
        }),
      };
    },
  }),
  tool({
    name: 'get_period_review',
    description: 'Performance summary for a week or month: tasks done and missed, habit consistency, workouts, weight change, money, mood, activity per life domain, neglected domains, goal progress.',
    schema: z.object({ period: z.enum(['week', 'month']), which: z.enum(['current', 'previous']).default('current') }),
    mutates: false,
    async run(repo, a, ctx) {
      const p = a.period === 'week' ? 'weekly' : 'monthly';
      let from = periodStart(p, ctx.today);
      if (a.which === 'previous') from = p === 'weekly' ? addDays(from, -7) : addMonths(from, -1);
      const to = p === 'weekly' ? addDays(from, 6) : endOfMonth(from);
      const r = { from, to };
      const [tasks, habits, habitLogs, workouts, weight, expenses, income, activities, prior, metrics, goals] = await Promise.all([
        repo.tasks.listBetween(from, to),
        repo.habits.list(),
        repo.habits.logsBetween(from, to),
        repo.workouts.list(r),
        repo.weight.list(r),
        repo.expenses.list(r),
        repo.income.list(r),
        repo.activities.list(r),
        repo.activities.list({ kinds: ['goal_progress'], to: addDays(from, -1), limit: 300 }),
        repo.metrics.list(r),
        repo.goals.list({ includeArchived: true }),
      ]);
      const s = summarizePeriod({ tasks, habits, habitLogs, workouts, weight, expenses, income, activities: [...activities, ...prior], metrics, goals }, from, to, ctx.today);
      return {
        result: {
          ...s,
          tasks: { ...s.tasks, missed: cap(s.tasks.missed, 10) },
          habits: { overallRate: s.habits.overallRate, perHabit: s.habits.perHabit.map((h) => ({ title: h.title, done: h.done, of: h.possible })) },
          currency: ctx.currency,
        },
      };
    },
  }),
  tool({
    name: 'get_domain_activity',
    description: 'Recent logged activity for one life domain or all of them (meditation, reading, social time, achievements, revenue…).',
    schema: z.object({ domain: domain.optional(), days: z.number().int().min(1).max(365).default(14) }),
    mutates: false,
    async run(repo, a, ctx) {
      const list = await repo.activities.list({ domain: a.domain, from: addDays(ctx.today, -(a.days - 1)), to: ctx.today, limit: 60 });
      return { result: cap(list, 40).map((x) => ({ date: dateOf(x.occurredAt), domain: x.domain, kind: x.kind, title: x.title, value: x.value, unit: x.unit, notes: x.notes })) };
    },
  }),
  tool({
    name: 'get_metrics',
    description: 'A tracked number over time: mood or energy (1-5), body measurements (waist, chest, hips, arm, thigh, body_fat) or balances (savings_balance, debt_balance).',
    schema: z.object({ metric: z.enum(Object.keys(METRIC_DOMAIN) as [string, ...string[]]), days: z.number().int().min(7).max(365).default(30) }),
    mutates: false,
    async run(repo, a, ctx) {
      const list = await repo.metrics.list({ metrics: [a.metric], from: addDays(ctx.today, -(a.days - 1)), to: ctx.today });
      const series = [...list].reverse().map((m) => ({ date: dateOf(m.recordedAt), value: m.value }));
      const t = trend(series);
      return { result: { metric: a.metric, latest: list[0] ? { value: list[0].value, unit: list[0].unit, date: dateOf(list[0].recordedAt) } : null, average: t ? r2(t.average) : null, change: t ? r2(t.change) : null, entries: cap(series.reverse(), 30) } };
    },
  }),
  tool({
    name: 'get_learning',
    description: 'Books and courses with progress, and skills with current and target levels.',
    schema: z.object({}),
    mutates: false,
    async run(repo) {
      const [resources, skills] = await Promise.all([repo.learning.list(), repo.skills.list()]);
      return {
        result: {
          resources: resources.map((r) => ({ id: r.id, kind: r.kind, title: r.title, author: r.author, status: r.status, progress: r.progress, total: r.total, unit: r.unit })),
          skills: skills.map((s) => ({ id: s.id, domain: s.domain, name: s.name, level: s.level, target: s.targetLevel })),
        },
      };
    },
  }),
  tool({
    name: 'get_projects',
    description: 'Career projects and entrepreneurial ideas, ventures and experiments.',
    schema: z.object({ domain: z.enum(['career', 'entrepreneurship']).optional() }),
    mutates: false,
    async run(repo, a) {
      const list = await repo.projects.list(a.domain);
      return { result: list.map((p) => ({ id: p.id, domain: p.domain, kind: p.kind, title: p.title, status: p.status, hypothesis: p.hypothesis, outcome: p.outcome, started: p.startedAt, completed: p.completedAt })) };
    },
  }),
  tool({
    name: 'get_reflections',
    description: 'Recent saved reflections (daily, weekly or monthly).',
    schema: z.object({ period: z.enum(['daily', 'weekly', 'monthly']).optional(), limit: z.number().int().min(1).max(10).default(3) }),
    mutates: false,
    async run(repo, a) {
      const list = await repo.reflections.list(a.period, a.limit);
      return { result: list.map((r) => ({ period: r.period, start: r.periodStart, mood: r.mood, energy: r.energy, responses: r.responses, domainRatings: r.domainRatings })) };
    },
  }),

  /* ───────────── Data entry ───────────── */
  tool({
    name: 'log_weight',
    description: 'Record a body-weight measurement for now.',
    schema: z.object({ value: z.number().positive(), unit: z.enum(['kg', 'lb']).optional().describe("Defaults to the user's unit") }),
    mutates: true,
    async run(repo, a, ctx) {
      const entry = strict(weightEntrySchema, { value: Math.round(a.value * 10) / 10, unit: a.unit ?? ctx.weightUnit });
      const log = await repo.weight.create(entry);
      return { result: { id: log.id, value: log.value, unit: log.unit }, summary: `Logged weight ${log.value} ${log.unit}` };
    },
  }),
  tool({
    name: 'log_workout',
    description: 'Record a completed workout.',
    schema: z.object({
      workoutType: z.enum(WORKOUT_TYPES),
      durationMin: z.number().int().min(1).max(600),
      intensity: z.enum(['easy', 'moderate', 'hard']).optional(),
      notes: z.string().max(500).optional(),
    }),
    mutates: true,
    async run(repo, a) {
      const w = await repo.workouts.create(strict(workoutEntrySchema, { ...a, intensity: a.intensity ?? null, notes: a.notes ?? null }));
      return { result: { id: w.id }, summary: `Logged ${w.workoutType.toLowerCase()} workout, ${w.durationMin} min` };
    },
  }),
  tool({
    name: 'record_expense',
    description: 'Record money spent.',
    schema: z.object({
      amount: z.number().positive(),
      category: z.enum(EXPENSE_CATEGORIES),
      note: z.string().max(140).optional(),
      currency: z.string().regex(/^[A-Z]{3}$/).optional().describe("ISO code, e.g. INR for ₹. Defaults to the user's currency"),
    }),
    mutates: true,
    async run(repo, a, ctx) {
      const e = await repo.expenses.create(strict(expenseEntrySchema, { amount: r2(a.amount), category: a.category, note: a.note ?? null, currency: a.currency ?? ctx.currency }));
      return { result: { id: e.id }, summary: `Recorded ${money(e.amount, e.currency)} for ${e.category.toLowerCase()}` };
    },
  }),
  tool({
    name: 'record_income',
    description: 'Record money received.',
    schema: z.object({ amount: z.number().positive(), source: z.string().min(1).max(60).describe('e.g. Salary, Freelance, Business'), note: z.string().max(140).optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional() }),
    mutates: true,
    async run(repo, a, ctx) {
      const i = await repo.income.create(strict(incomeEntrySchema, { amount: r2(a.amount), source: a.source, note: a.note ?? null, currency: a.currency ?? ctx.currency }));
      return { result: { id: i.id }, summary: `Recorded ${money(i.amount, i.currency)} income from ${i.source}` };
    },
  }),
  tool({
    name: 'create_task',
    description: 'Create a task. A due time makes it a commitment.',
    schema: z.object({
      title: z.string().min(1).max(200),
      dueDate: date.optional().describe('Defaults to today'),
      dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional().describe('24h HH:MM'),
      isPriority: z.boolean().optional(),
      domain: domain.optional(),
    }),
    mutates: true,
    async run(repo, a, ctx) {
      const t = await repo.tasks.create(strict(newTaskSchema, { title: a.title, dueDate: a.dueDate ?? ctx.today, dueTime: a.dueTime ?? null, isPriority: a.isPriority ?? false, domain: a.domain ?? null }));
      return { result: { id: t.id, title: t.title, due: t.dueDate }, summary: `Added task “${t.title}”${t.dueDate === ctx.today ? '' : ` for ${t.dueDate}`}` };
    },
  }),
  tool({
    name: 'set_habit_done',
    description: "Mark a habit done (or not done) for a day. Find the habit id with get_today first.",
    schema: z.object({ habitId: z.string().uuid().or(z.string().min(1)), done: z.boolean().default(true), date: date.optional() }),
    mutates: true,
    async run(repo, a, ctx) {
      const habit = (await repo.habits.list()).find((h) => h.id === a.habitId);
      if (!habit) throw new ToolInputError('No habit with that id. Call get_today to list habits.');
      await repo.habits.setDone(habit.id, a.date ?? ctx.today, a.done);
      return { result: { ok: true }, summary: `${a.done ? 'Checked off' : 'Unchecked'} “${habit.title}”` };
    },
  }),
  tool({
    name: 'log_activity',
    description:
      'Record something done in a life domain. Common kinds: mental meditation|journal|focus, intellectual note, social social|speaking|outreach, career achievement|milestone, entrepreneurship revenue (value = monthly revenue)|milestone.',
    schema: z.object({
      domain,
      kind: z.string().regex(/^[a-z_]{1,32}$/),
      title: z.string().min(1).max(160),
      value: z.number().min(0).optional(),
      unit: z.string().max(20).optional().describe('e.g. min, pages, or a currency code'),
      notes: z.string().max(2000).optional(),
      goalId: z.string().optional(),
    }),
    mutates: true,
    async run(repo, a, ctx) {
      const unit = a.kind === 'revenue' ? (a.unit ?? ctx.currency) : (a.unit ?? null);
      const x = await repo.activities.create(strict(activityEntrySchema, { ...a, value: a.value ?? null, unit, notes: a.notes ?? null, goalId: a.goalId ?? null, details: {} }));
      return { result: { id: x.id }, summary: `Logged ${a.kind.replace(/_/g, ' ')}: ${x.title}` };
    },
  }),
  tool({
    name: 'record_metric',
    description: 'Record mood or energy (1-5), a body measurement (cm, or % for body_fat) or a savings/debt balance.',
    schema: z.object({ metric: z.enum(Object.keys(METRIC_DOMAIN) as [string, ...string[]]), value: z.number() }),
    mutates: true,
    async run(repo, a, ctx) {
      const d = METRIC_DOMAIN[a.metric]!;
      const unit = d === 'financial' ? ctx.currency : a.metric === 'body_fat' ? '%' : d === 'physical' ? 'cm' : null;
      const m = await repo.metrics.record(strict(metricEntrySchema, { domain: d, metric: a.metric, value: a.value, unit }));
      return { result: { id: m.id }, summary: `Recorded ${a.metric.replace(/_/g, ' ')}: ${m.value}${unit && unit !== '%' ? ` ${unit}` : unit ?? ''}` };
    },
  }),
  tool({
    name: 'log_learning_progress',
    description: 'Add pages read or lessons completed to a book or course. Find the id with get_learning.',
    schema: z.object({ resourceId: z.string().min(1), amount: z.number().positive() }),
    mutates: true,
    async run(repo, a) {
      const resource = (await repo.learning.list()).find((r) => r.id === a.resourceId);
      if (!resource) throw new ToolInputError('No book or course with that id. Call get_learning first.');
      const { updated, finished } = await logLearningProgress(repo, resource, a.amount);
      return { result: { progress: updated.progress, total: updated.total, finished }, summary: finished ? `Finished “${resource.title}”` : `Logged ${a.amount} ${resource.unit} of “${resource.title}”` };
    },
  }),

  /* ───────────── Task execution & updates ───────────── */
  tool({
    name: 'complete_task',
    description: 'Mark a task done or not done. Find the id with get_today or find_tasks first.',
    schema: z.object({ taskId: z.string().min(1), completed: z.boolean().default(true) }),
    mutates: true,
    async run(repo, a) {
      const t = await repo.tasks.setCompleted(a.taskId, a.completed);
      return { result: { id: t.id, done: !!t.completedAt }, summary: `${a.completed ? 'Completed' : 'Reopened'} “${t.title}”` };
    },
  }),
  tool({
    name: 'update_task',
    description: 'Change a task: title, date, time or priority.',
    schema: z.object({
      taskId: z.string().min(1),
      title: z.string().min(1).max(200).optional(),
      dueDate: date.optional(),
      dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      isPriority: z.boolean().optional(),
    }),
    mutates: true,
    confirm: true,
    describe: (a) =>
      `Update the task: ${[a.title && `rename to “${a.title}”`, a.dueDate && `move to ${a.dueDate}`, a.dueTime !== undefined && (a.dueTime ? `set time ${a.dueTime}` : 'remove the time'), a.isPriority !== undefined && (a.isPriority ? 'make it a priority' : 'remove priority')].filter(Boolean).join(', ')}`,
    async run(repo, a) {
      const { taskId, ...patch } = a;
      const t = await repo.tasks.update(taskId, strict(taskUpdateSchema, patch));
      return { result: { id: t.id, title: t.title, due: t.dueDate, time: t.dueTime, priority: t.isPriority }, summary: `Updated “${t.title}”` };
    },
  }),
  tool({
    name: 'create_goal',
    description: 'Create a goal in a life domain. For goals that count down (lose weight, pay off debt) set startValue.',
    schema: z.object({
      domain,
      title: z.string().min(1).max(120),
      targetValue: z.number().optional(),
      startValue: z.number().optional(),
      currentValue: z.number().optional(),
      unit: z.string().max(20).optional(),
      targetDate: date.optional(),
    }),
    mutates: true,
    confirm: true,
    describe: (a) => `Create a ${a.domain} goal “${a.title}”${a.targetValue !== undefined ? ` (target ${a.targetValue}${a.unit ? ` ${a.unit}` : ''})` : ''}${a.targetDate ? ` by ${a.targetDate}` : ''}`,
    async run(repo, a) {
      const g = await repo.goals.create(
        strict(newGoalSchema, { ...a, targetValue: a.targetValue ?? null, startValue: a.startValue ?? null, currentValue: a.currentValue ?? a.startValue ?? 0, unit: a.unit ?? null, targetDate: a.targetDate ?? null }),
      );
      return { result: { id: g.id }, summary: `Created goal “${g.title}”` };
    },
  }),
  tool({
    name: 'update_goal',
    description: 'Update a goal: progress (currentValue), target, date, title or status (completed, paused, archived, active).',
    schema: z.object({
      goalId: z.string().min(1),
      currentValue: z.number().optional(),
      targetValue: z.number().optional(),
      targetDate: date.optional(),
      title: z.string().min(1).max(120).optional(),
      status: z.enum(['active', 'completed', 'paused', 'archived']).optional(),
    }),
    mutates: true,
    confirm: true,
    describe: (a) =>
      `Update the goal: ${[a.currentValue !== undefined && `progress to ${a.currentValue}`, a.targetValue !== undefined && `target to ${a.targetValue}`, a.targetDate && `deadline ${a.targetDate}`, a.title && `rename to “${a.title}”`, a.status && `mark ${a.status}`].filter(Boolean).join(', ')}`,
    async run(repo, a) {
      const { goalId, ...patch } = a;
      const g = await repo.goals.update(goalId, strict(goalUpdateSchema, patch));
      return { result: { id: g.id, current: g.currentValue, status: g.status }, summary: `Updated goal “${g.title}”` };
    },
  }),
  tool({
    name: 'save_reflection',
    description:
      'Save a reflection. Daily keys: went_well, accomplished, incomplete, distractions, improve. Weekly: achievements, missed, consistency, challenges, lessons, priorities. Monthly: overall, health, financial, career, entrepreneurship, achievements, attention, priorities. Replaces an existing reflection for the same period.',
    schema: z.object({
      period: z.enum(['daily', 'weekly', 'monthly']),
      periodStart: date.optional().describe('Defaults to the current day, week (Monday) or month'),
      responses: z.record(z.string(), z.string().max(4000)),
      mood: z.number().int().min(1).max(5).optional(),
      energy: z.number().int().min(1).max(5).optional(),
    }),
    mutates: true,
    confirm: true,
    describe: (a, ctx) => `Save your ${a.period} reflection for ${periodStart(a.period, a.periodStart ?? ctx.today)} (replaces any existing one)`,
    async run(repo, a, ctx) {
      const start = periodStart(a.period, a.periodStart ?? ctx.today);
      const existing = await repo.reflections.get(a.period, start);
      const r = await repo.reflections.save(
        strict(reflectionSchema, {
          period: a.period,
          periodStart: start,
          responses: { ...(existing?.responses ?? {}), ...a.responses },
          mood: a.mood ?? existing?.mood ?? null,
          energy: a.energy ?? existing?.energy ?? null,
          domainRatings: existing?.domainRatings ?? {},
          goalIds: existing?.goalIds ?? [],
        }),
      );
      return { result: { id: r.id, period: r.period, start: r.periodStart }, summary: `Saved your ${a.period} reflection` };
    },
  }),
] satisfies ToolDefinition<z.ZodType>[];

export type ToolName = (typeof TOOLS)[number]['name'];

export function findTool(name: string): ToolDefinition | undefined {
  return (TOOLS as ToolDefinition[]).find((t) => t.name === name);
}

/** Tool list in the shape the model API expects. */
export function toolSpecs(): ToolSpec[] {
  return (TOOLS as ToolDefinition[]).map((t) => {
    const { $schema: _ignored, ...parameters } = z.toJSONSchema(t.schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
    return { name: t.name, description: t.description, parameters };
  });
}
