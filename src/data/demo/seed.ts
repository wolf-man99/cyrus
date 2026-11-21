import { addDays, today, type ISODate } from '@/lib/dates';
import { uid } from '@/lib/id';
import type { Goal, Habit, HabitLog, Profile, Reflection, Task, Transaction, WeightLog, Workout } from '@/domain/types';

/**
 * Sample data for DEMO MODE. Generated relative to the current date so the
 * dashboard always looks alive. Never written anywhere.
 */
export interface DemoState {
  profile: Profile;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  weight: WeightLog[];
  workouts: Workout[];
  transactions: Transaction[];
  goals: Goal[];
  reflections: Reflection[];
}

function at(date: ISODate, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString();
}

export function createDemoState(now: ISODate = today()): DemoState {
  const created = new Date().toISOString();
  const task = (t: Partial<Task> & Pick<Task, 'title'>): Task => ({
    id: uid(),
    notes: null,
    domain: null,
    dueDate: now,
    dueTime: null,
    isPriority: false,
    completedAt: null,
    createdAt: created,
    ...t,
  });

  const tasks: Task[] = [
    task({ title: 'Finish Q4 strategy draft', domain: 'career', isPriority: true }),
    task({ title: 'Deep work: course module 3', domain: 'intellectual', isPriority: true, dueTime: '14:00' }),
    task({ title: 'Review monthly budget', domain: 'financial', isPriority: true, completedAt: created }),
    task({ title: 'Team sync', domain: 'career', dueTime: '10:00', completedAt: created }),
    task({ title: 'Reply to investor email', domain: 'entrepreneurship', dueTime: '16:00' }),
    task({ title: 'Call Mum', domain: 'social', dueTime: '19:30' }),
    task({ title: 'Book dentist appointment', domain: 'physical' }),
    task({ title: 'Send invoice to client', domain: 'financial', dueDate: addDays(now, -1) }),
    // Upcoming
    task({ title: 'Long run — 10 km', domain: 'physical', dueDate: addDays(now, 1), dueTime: '07:00' }),
    task({ title: 'Public speaking practice', domain: 'social', dueDate: addDays(now, 2), dueTime: '18:30' }),
    task({ title: 'Mentor session', domain: 'career', dueDate: addDays(now, 3), dueTime: '12:00' }),
    task({ title: 'Submit course assignment', domain: 'intellectual', dueDate: addDays(now, 5) }),
  ];

  const habit = (title: string, icon: Habit['icon'], domain: Habit['domain'], sortOrder: number): Habit => ({
    id: uid(),
    title,
    icon,
    domain,
    sortOrder,
    createdAt: created,
  });
  const habits: Habit[] = [
    habit('Meditate', 'sparkles', 'mental', 0),
    habit('Move 30 min', 'dumbbell', 'physical', 1),
    habit('Read 20 pages', 'book-open', 'intellectual', 2),
    habit('Drink 2L water', 'droplet', 'physical', 3),
    habit('Journal', 'pen-line', 'mental', 4),
    habit('No-spend day', 'piggy-bank', 'financial', 5),
  ];

  // Streak history: [habit index, days done counting back from yesterday, done today]
  const history: [number, number, boolean][] = [
    [0, 11, true],
    [1, 4, false],
    [2, 6, false],
    [3, 2, true],
    [4, 0, false],
    [5, 1, false],
  ];
  const habitLogs: HabitLog[] = [];
  for (const [i, streak, doneToday] of history) {
    const h = habits[i]!;
    if (doneToday) habitLogs.push({ id: uid(), habitId: h.id, logDate: now });
    for (let d = 1; d <= streak; d++) habitLogs.push({ id: uid(), habitId: h.id, logDate: addDays(now, -d) });
  }

  const weights = [79.1, 78.9, 79.0, 78.7, 78.8, 78.5, 78.6, 78.4, 78.3];
  const weight: WeightLog[] = weights
    .map((value, i) => ({
      id: uid(),
      value,
      unit: 'kg' as const,
      loggedAt: at(addDays(now, -(weights.length - i) * 2), '07:30'),
    }))
    .reverse();

  const workouts: Workout[] = [
    { id: uid(), workoutType: 'Strength', durationMin: 50, intensity: 'hard', performedAt: at(addDays(now, -1), '18:10') },
    { id: uid(), workoutType: 'Run', durationMin: 32, intensity: 'moderate', performedAt: at(addDays(now, -3), '07:05') },
    { id: uid(), workoutType: 'Yoga', durationMin: 25, intensity: 'easy', performedAt: at(addDays(now, -4), '20:00') },
  ];

  const expense = (amount: number, category: string, note: string | null, daysAgo: number): Transaction => ({
    id: uid(),
    kind: 'expense',
    amount,
    currency: 'USD',
    category,
    note,
    occurredAt: at(addDays(now, -daysAgo), '12:30'),
  });
  const transactions: Transaction[] = [
    expense(12.5, 'Food', 'Lunch', 0),
    expense(4.2, 'Food', 'Coffee', 0),
    expense(38, 'Transport', 'Fuel', 1),
    expense(64.99, 'Shopping', null, 2),
    expense(19.99, 'Learning', 'Course subscription', 4),
  ];

  const goals: Goal[] = [
    { id: uid(), domain: 'physical', title: 'Reach 76 kg', targetValue: 76, currentValue: 78.3, unit: 'kg', targetDate: addDays(now, 70), status: 'active' },
    { id: uid(), domain: 'physical', title: 'Run a sub-50 10K', targetValue: null, currentValue: 0, unit: null, targetDate: addDays(now, 90), status: 'active' },
    { id: uid(), domain: 'intellectual', title: 'Read 24 books this year', targetValue: 24, currentValue: 17, unit: 'books', targetDate: null, status: 'active' },
    { id: uid(), domain: 'financial', title: 'Emergency fund', targetValue: 10000, currentValue: 6400, unit: 'USD', targetDate: null, status: 'active' },
    { id: uid(), domain: 'mental', title: 'Meditate 100 days', targetValue: 100, currentValue: 12, unit: 'days', targetDate: null, status: 'active' },
    { id: uid(), domain: 'career', title: 'Lead a cross-team project', targetValue: null, currentValue: 0, unit: null, targetDate: null, status: 'active' },
    { id: uid(), domain: 'social', title: 'Give 5 talks', targetValue: 5, currentValue: 2, unit: 'talks', targetDate: null, status: 'active' },
    { id: uid(), domain: 'entrepreneurship', title: 'Validate side-project idea', targetValue: 20, currentValue: 7, unit: 'interviews', targetDate: null, status: 'active' },
  ];

  return {
    profile: { id: 'demo', displayName: null, weightUnit: 'kg', currency: 'USD' },
    tasks,
    habits,
    habitLogs,
    weight,
    workouts,
    transactions,
    goals,
    reflections: [],
  };
}
