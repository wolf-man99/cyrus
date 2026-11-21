import { addDays } from '@/lib/dates';
import { uid } from '@/lib/id';
import type { Repository } from '../repository';
import { createDemoState, type DemoState } from './seed';

const byTime = (a: { dueTime: string | null }, b: { dueTime: string | null }) =>
  (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99');

/**
 * In-memory repository for DEMO MODE.
 * Data lives only in this browser tab and resets on reload — the UI says so wherever it matters.
 */
export function createDemoRepository(options: { latencyMs?: number; state?: DemoState } = {}): Repository {
  const state = options.state ?? createDemoState();
  const latency = options.latencyMs ?? 140;
  const wait = <T>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latency));

  return {
    mode: 'demo',

    profile: {
      get: () => wait(state.profile),
    },

    tasks: {
      listForDay(date) {
        const due = state.tasks.filter(
          (t) => t.dueDate === date || (t.dueDate !== null && t.dueDate < date && t.completedAt === null),
        );
        return wait(due.sort(byTime));
      },
      listUpcoming(date, days) {
        const end = addDays(date, days);
        const upcoming = state.tasks
          .filter((t) => t.dueDate !== null && t.dueDate > date && t.dueDate <= end && t.completedAt === null)
          .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || byTime(a, b));
        return wait(upcoming);
      },
      create(input) {
        const task = { id: uid(), createdAt: new Date().toISOString(), completedAt: null, ...input };
        state.tasks.push(task);
        return wait(task);
      },
      setCompleted(id, completed) {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return Promise.reject(new Error('Task not found'));
        task.completedAt = completed ? new Date().toISOString() : null;
        return wait(task);
      },
      remove(id) {
        state.tasks = state.tasks.filter((t) => t.id !== id);
        return wait(undefined);
      },
    },

    habits: {
      list: () => wait([...state.habits].sort((a, b) => a.sortOrder - b.sortOrder)),
      create(input) {
        const habit = {
          id: uid(),
          createdAt: new Date().toISOString(),
          sortOrder: state.habits.length,
          ...input,
        };
        state.habits.push(habit);
        return wait(habit);
      },
      archive(id) {
        state.habits = state.habits.filter((h) => h.id !== id);
        return wait(undefined);
      },
      logsBetween(from, to) {
        return wait(state.habitLogs.filter((l) => l.logDate >= from && l.logDate <= to));
      },
      setDone(habitId, date, done) {
        const exists = state.habitLogs.some((l) => l.habitId === habitId && l.logDate === date);
        if (done && !exists) state.habitLogs.push({ id: uid(), habitId, logDate: date });
        if (!done) state.habitLogs = state.habitLogs.filter((l) => !(l.habitId === habitId && l.logDate === date));
        return wait(undefined);
      },
    },

    weight: {
      list: (limit = 30) => wait(state.weight.slice(0, limit)),
      create(input) {
        const log = { id: uid(), loggedAt: new Date().toISOString(), ...input };
        state.weight.unshift(log);
        return wait(log);
      },
    },

    workouts: {
      list: (limit = 30) => wait(state.workouts.slice(0, limit)),
      create(input) {
        const workout = { id: uid(), performedAt: new Date().toISOString(), ...input };
        state.workouts.unshift(workout);
        return wait(workout);
      },
    },

    transactions: {
      list: (limit = 50) => wait(state.transactions.slice(0, limit)),
      createExpense(input) {
        const tx = { id: uid(), kind: 'expense' as const, occurredAt: new Date().toISOString(), ...input };
        state.transactions.unshift(tx);
        return wait(tx);
      },
    },

    goals: {
      list: (domain) => wait(state.goals.filter((g) => !domain || g.domain === domain)),
    },

    reflections: {
      list: (period, limit = 30) => wait(state.reflections.filter((r) => r.period === period).slice(0, limit)),
    },
  };
}

