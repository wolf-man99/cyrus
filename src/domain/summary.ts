import { addDays, dateOf, diffInDays, today, type ISODate } from '@/lib/dates';
import { LIFE_DOMAINS } from './types';
import type {
  ActivityLog,
  DomainMetric,
  Expense,
  Goal,
  Habit,
  HabitLog,
  Income,
  LifeDomain,
  Task,
  WeightLog,
  Workout,
} from './types';

/** Everything needed to review a period. Collections may contain items outside the range; they are filtered. */
export interface PeriodData {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  workouts: Workout[];
  weight: WeightLog[];
  expenses: Expense[];
  income: Income[];
  activities: ActivityLog[];
  metrics: DomainMetric[];
  goals: Goal[];
}

export interface PeriodSummary {
  from: ISODate;
  to: ISODate;
  /** Days elapsed so far (a current week counts only up to today). */
  days: number;
  tasks: { total: number; done: number; rate: number | null; missed: { id: string; title: string; dueDate: ISODate | null }[] };
  habits: { overallRate: number | null; perHabit: { id: string; title: string; done: number; possible: number; rate: number }[] };
  workouts: { count: number; minutes: number };
  weight: { start: number; end: number; change: number; unit: string } | null;
  money: { spent: number; earned: number; net: number; topCategories: { category: string; total: number }[] };
  mood: number | null;
  energy: number | null;
  domains: Record<LifeDomain, number>;
  neglected: LifeDomain[];
  goalsProgressed: { goalId: string; title: string; from: number | null; to: number }[];
}

const within = (date: ISODate, from: ISODate, to: ISODate) => date >= from && date <= to;
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizePeriod(data: PeriodData, from: ISODate, to: ISODate, now: ISODate = today()): PeriodSummary {
  const end = to > now ? now : to;
  const days = Math.max(1, diffInDays(end, from) + 1);
  const inRange = (ts: string) => within(dateOf(ts), from, end);

  const tasks = data.tasks.filter((t) => t.dueDate && within(t.dueDate, from, end));
  const done = tasks.filter((t) => t.completedAt);
  const missed = tasks.filter((t) => !t.completedAt && t.dueDate! < now);

  const perHabit = data.habits.map((h) => {
    const created = dateOf(h.createdAt);
    const start = created > from ? created : from;
    const possible = Math.max(0, diffInDays(end, start) + 1);
    const doneDays = data.habitLogs.filter((l) => l.habitId === h.id && within(l.logDate, from, end)).length;
    return { id: h.id, title: h.title, done: doneDays, possible, rate: possible ? Math.min(1, doneDays / possible) : 0 };
  });
  const possibleTotal = perHabit.reduce((s, h) => s + h.possible, 0);

  const workouts = data.workouts.filter((w) => inRange(w.performedAt));
  const weights = data.weight.filter((w) => inRange(w.loggedAt)).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const expenses = data.expenses.filter((e) => inRange(e.occurredAt));
  const income = data.income.filter((i) => inRange(i.receivedAt));
  const activities = data.activities.filter((a) => inRange(a.occurredAt));
  const metrics = data.metrics.filter((m) => inRange(m.recordedAt));

  const categories = new Map<string, number>();
  for (const e of expenses) categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount);

  const domains = Object.fromEntries(LIFE_DOMAINS.map((d) => [d, 0])) as Record<LifeDomain, number>;
  for (const a of activities) if (a.kind !== 'goal_progress') domains[a.domain]++;
  for (const t of done) if (t.domain) domains[t.domain]++;
  domains.physical += workouts.length + weights.length;
  domains.financial += expenses.length > 0 ? 1 : 0;

  const goalsProgressed = data.goals
    .map((g) => {
      const updates = activities
        .filter((a) => a.kind === 'goal_progress' && a.goalId === g.id && a.value !== null)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      if (!updates.length) return null;
      const before = data.activities
        .filter((a) => a.kind === 'goal_progress' && a.goalId === g.id && dateOf(a.occurredAt) < from && a.value !== null)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
      // Only compare against a recorded earlier value; never guess where the period started.
      return { goalId: g.id, title: g.title, from: before?.value ?? null, to: updates.at(-1)!.value! };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  return {
    from,
    to,
    days,
    tasks: {
      total: tasks.length,
      done: done.length,
      rate: tasks.length ? done.length / tasks.length : null,
      missed: missed.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate })),
    },
    habits: { overallRate: possibleTotal ? perHabit.reduce((s, h) => s + h.done, 0) / possibleTotal : null, perHabit },
    workouts: { count: workouts.length, minutes: workouts.reduce((s, w) => s + w.durationMin, 0) },
    weight:
      weights.length >= 2
        ? {
            start: weights[0]!.value,
            end: weights.at(-1)!.value,
            change: Math.round((weights.at(-1)!.value - weights[0]!.value) * 10) / 10,
            unit: weights[0]!.unit,
          }
        : null,
    money: {
      spent: round2(expenses.reduce((s, e) => s + e.amount, 0)),
      earned: round2(income.reduce((s, i) => s + i.amount, 0)),
      net: round2(income.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)),
      topCategories: [...categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, total]) => ({ category, total: round2(total) })),
    },
    mood: avg(metrics.filter((m) => m.metric === 'mood').map((m) => m.value)),
    energy: avg(metrics.filter((m) => m.metric === 'energy').map((m) => m.value)),
    domains,
    neglected: LIFE_DOMAINS.filter((d) => domains[d] === 0),
    goalsProgressed,
  };
}

/** A range that ends at `to` and spans `days` days. */
export function rangeEndingAt(to: ISODate, days: number) {
  return { from: addDays(to, -(days - 1)), to };
}
