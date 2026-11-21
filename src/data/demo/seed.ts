import { addDays, startOfMonth, startOfWeek, today, type ISODate } from '@/lib/dates';
import { uid } from '@/lib/id';
import type {
  ActivityLog,
  Conversation,
  DomainMetric,
  Expense,
  Goal,
  Habit,
  HabitLog,
  HealthReport,
  Income,
  Investment,
  LearningResource,
  LifeDomain,
  Profile,
  Project,
  Reflection,
  Skill,
  StoredMessage,
  Task,
  WeightLog,
  Workout,
} from '@/domain/types';

/**
 * Sample data for DEMO MODE: about three months of plausible history across all seven
 * domains, generated relative to today with a fixed seed. Never written anywhere.
 */
export interface DemoState {
  profile: Profile;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  goals: Goal[];
  metrics: DomainMetric[];
  activities: ActivityLog[];
  weight: WeightLog[];
  workouts: Workout[];
  expenses: Expense[];
  income: Income[];
  investments: Investment[];
  learning: LearningResource[];
  skills: Skill[];
  projects: Project[];
  healthReports: HealthReport[];
  /** Demo-only file contents for health reports, keyed by storage path. */
  files: Record<string, string>;
  reflections: Reflection[];
  conversations: Conversation[];
  messages: StoredMessage[];
}

/** Deterministic PRNG so the demo looks the same on every load (and in tests). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (date: ISODate, hhmm: string) => new Date(`${date}T${hhmm}:00`).toISOString();
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const DAYS = 90;

export function createDemoState(now: ISODate = today()): DemoState {
  const rnd = mulberry32(42);
  const chance = (p: number) => rnd() < p;
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)]!;
  const between = (min: number, max: number) => min + rnd() * (max - min);
  const created = new Date().toISOString();
  const day = (offset: number) => addDays(now, -offset);

  /* ───────── Tasks ───────── */
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
    task({ title: 'Deep work: ML course module 15', domain: 'intellectual', isPriority: true, dueTime: '14:00' }),
    task({ title: 'Review monthly budget', domain: 'financial', isPriority: true, completedAt: created }),
    task({ title: 'Team sync', domain: 'career', dueTime: '10:00', completedAt: created }),
    task({ title: 'Reply to newsletter sponsor', domain: 'entrepreneurship', dueTime: '16:00' }),
    task({ title: 'Call Mum', domain: 'social', dueTime: '19:30' }),
    task({ title: 'Book dentist appointment', domain: 'physical' }),
    task({ title: 'Send invoice to client', domain: 'financial', dueDate: day(1) }),
    task({ title: 'Long run — 10 km', domain: 'physical', dueDate: addDays(now, 1), dueTime: '07:00' }),
    task({ title: 'Toastmasters speech practice', domain: 'social', dueDate: addDays(now, 2), dueTime: '18:30' }),
    task({ title: 'Mentor session', domain: 'career', dueDate: addDays(now, 3), dueTime: '12:00' }),
    task({ title: 'Submit course assignment', domain: 'intellectual', dueDate: addDays(now, 5) }),
  ];
  // Past weeks: a realistic mix of done and missed work, so reviews have something to show.
  const pastTitles: [string, LifeDomain][] = [
    ['Write project update', 'career'],
    ['Grocery run', 'physical'],
    ['Pay credit card', 'financial'],
    ['Draft newsletter issue', 'entrepreneurship'],
    ['Read 30 pages', 'intellectual'],
    ['Catch up with Sam', 'social'],
    ['Plan the week', 'mental'],
  ];
  for (let d = 2; d <= 35; d++) {
    const n = chance(0.5) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const [title, domain] = pick(pastTitles);
      // The last week is all done; older weeks include missed work, which Reflect surfaces.
      const done = d <= 7 || chance(0.75);
      tasks.push(task({ title, domain, dueDate: day(d), completedAt: done ? at(day(d), '17:00') : null }));
    }
  }

  /* ───────── Habits ───────── */
  const habit = (title: string, icon: Habit['icon'], domain: Habit['domain'], sortOrder: number): Habit => ({
    id: uid(),
    title,
    icon,
    domain,
    sortOrder,
    // Habits have existed for the whole history window, so consistency stats cover it.
    createdAt: at(day(DAYS), '08:00'),
  });
  const habits: Habit[] = [
    habit('Meditate', 'brain', 'mental', 0),
    habit('Move 30 min', 'dumbbell', 'physical', 1),
    habit('Read 20 pages', 'book-open', 'intellectual', 2),
    habit('Drink 2L water', 'droplet', 'physical', 3),
    habit('Journal', 'pen-line', 'mental', 4),
    habit('No-spend day', 'piggy-bank', 'financial', 5),
  ];
  const habitRates = [0.86, 0.62, 0.7, 0.8, 0.45, 0.35];
  const habitLogs: HabitLog[] = [];
  habits.forEach((h, i) => {
    for (let d = 1; d <= 60; d++) if (chance(habitRates[i]!)) habitLogs.push({ id: uid(), habitId: h.id, logDate: day(d) });
  });
  // Today: meditation and water already done; meditation on a clean streak.
  for (let d = 0; d <= 11; d++) {
    if (!habitLogs.some((l) => l.habitId === habits[0]!.id && l.logDate === day(d)))
      habitLogs.push({ id: uid(), habitId: habits[0]!.id, logDate: day(d) });
  }
  habitLogs.push({ id: uid(), habitId: habits[3]!.id, logDate: now });

  /* ───────── Physical ───────── */
  const weight: WeightLog[] = [];
  for (let d = DAYS; d >= 1; d -= chance(0.5) ? 2 : 3) {
    const trend = 82.6 - ((DAYS - d) / DAYS) * 4.3;
    weight.push({ id: uid(), value: round(trend + between(-0.35, 0.35)), unit: 'kg', loggedAt: at(day(d), '07:20') });
  }
  weight.reverse();

  const workouts: Workout[] = [];
  const plan: [Workout['workoutType'], number, Workout['intensity']][] = [
    ['Strength', 50, 'hard'],
    ['Run', 32, 'moderate'],
    ['Strength', 45, 'hard'],
    ['Yoga', 25, 'easy'],
  ];
  for (let d = DAYS; d >= 1; d--) {
    const weekday = new Date(`${day(d)}T12:00:00`).getDay();
    if (![1, 3, 5, 6].includes(weekday) || !chance(0.82)) continue;
    const [type, mins, intensity] = plan[[1, 3, 5, 6].indexOf(weekday)]!;
    workouts.push({
      id: uid(),
      workoutType: type,
      durationMin: Math.round(mins + between(-6, 8)),
      intensity,
      notes: null,
      exercises:
        type === 'Strength'
          ? [
              { name: 'Squat', sets: 4, reps: 6, weight: round(70 + (DAYS - d) * 0.15, 0) },
              { name: 'Bench press', sets: 4, reps: 8, weight: round(55 + (DAYS - d) * 0.1, 0) },
              { name: 'Pull-ups', sets: 3, reps: 8 },
            ]
          : [],
      performedAt: at(day(d), type === 'Run' ? '06:50' : '18:15'),
    });
  }
  workouts.reverse();

  const metrics: DomainMetric[] = [];
  const metric = (domain: LifeDomain, name: string, value: number, unit: string | null, date: ISODate, time = '08:00') =>
    metrics.push({ id: uid(), domain, metric: name, value, unit, note: null, recordedAt: at(date, time) });
  for (let d = 84; d >= 0; d -= 14) {
    const progress = (84 - d) / 84;
    metric('physical', 'waist', round(88.5 - 3 * progress + between(-0.3, 0.3)), 'cm', day(d));
    metric('physical', 'body_fat', round(22.4 - 1.8 * progress + between(-0.2, 0.2)), '%', day(d));
  }

  const healthReports: HealthReport[] = [
    {
      id: uid(),
      title: 'Annual blood panel',
      storagePath: 'demo/annual-blood-panel.svg',
      fileName: 'annual-blood-panel.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 1800,
      reportDate: day(41),
      notes: 'Vitamin D slightly low — retest in 3 months',
      createdAt: at(day(40), '10:00'),
    },
  ];
  const files: Record<string, string> = {
    'demo/annual-blood-panel.svg':
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#0e131c"/><text x="40" y="80" fill="#eef3fa" font-family="sans-serif" font-size="28">Sample report (demo)</text><text x="40" y="130" fill="#8f9bae" font-family="sans-serif" font-size="18">Uploaded files in demo mode stay in this tab only.</text></svg>`,
      ),
  };

  /* ───────── Mental ───────── */
  const activities: ActivityLog[] = [];
  const activity = (a: Omit<ActivityLog, 'id' | 'details' | 'goalId' | 'notes' | 'value' | 'unit'> & Partial<ActivityLog>) =>
    activities.push({ id: uid(), details: {}, goalId: null, notes: null, value: null, unit: null, ...a });
  const journalNotes = [
    'Slow start, but the afternoon deep-work block went well.',
    'Felt scattered after too many meetings. Need protected focus time.',
    'Good run this morning. Energy carried through the day.',
    'Struggled to switch off in the evening. Phone away earlier tomorrow.',
    'Proud of finishing the draft even though it isn’t perfect.',
  ];
  for (let d = 85; d >= 1; d--) {
    if (chance(0.86)) {
      const base = 3.5 + Math.sin(d / 6) * 0.6;
      metric('mental', 'mood', Math.max(1, Math.min(5, Math.round(base + between(-1, 1)))), null, day(d), '21:30');
      metric('mental', 'energy', Math.max(1, Math.min(5, Math.round(base - 0.2 + between(-1.1, 1)))), null, day(d), '21:30');
    }
    if (chance(0.8)) activity({ domain: 'mental', kind: 'meditation', title: 'Meditation', value: pick([10, 10, 15, 20]), unit: 'min', occurredAt: at(day(d), '07:00') });
    if (chance(0.35)) activity({ domain: 'mental', kind: 'journal', title: 'Journal entry', notes: journalNotes[d % journalNotes.length]!, occurredAt: at(day(d), '22:00') });
    const weekday = new Date(`${day(d)}T12:00:00`).getDay();
    if (weekday > 0 && weekday < 6 && chance(0.7))
      activity({ domain: 'mental', kind: 'focus', title: pick(['Strategy doc', 'ML course', 'Newsletter draft', 'Inbox zero']), value: pick([25, 50, 50, 90]), unit: 'min', occurredAt: at(day(d), '10:00') });
  }

  /* ───────── Intellectual ───────── */
  const lr = (r: Omit<LearningResource, 'id' | 'updatedAt' | 'rating' | 'notes' | 'author' | 'startedAt' | 'completedAt'> & Partial<LearningResource>): LearningResource => ({
    id: uid(),
    author: null,
    rating: null,
    notes: null,
    startedAt: null,
    completedAt: null,
    updatedAt: created,
    ...r,
  });
  const deepWork = lr({ kind: 'book', title: 'Deep Work', author: 'Cal Newport', status: 'active', progress: 142, total: 296, unit: 'pages', startedAt: day(24) });
  const money = lr({ kind: 'book', title: 'The Psychology of Money', author: 'Morgan Housel', status: 'active', progress: 88, total: 256, unit: 'pages', startedAt: day(10) });
  const ml = lr({ kind: 'course', title: 'Machine Learning Specialization', author: 'Coursera', status: 'active', progress: 14, total: 32, unit: 'lessons', startedAt: day(60) });
  const learning: LearningResource[] = [
    deepWork,
    money,
    ml,
    lr({ kind: 'book', title: 'Atomic Habits', author: 'James Clear', status: 'completed', progress: 320, total: 320, unit: 'pages', rating: 5, startedAt: day(70), completedAt: day(38) }),
    lr({ kind: 'book', title: 'The Mom Test', author: 'Rob Fitzpatrick', status: 'completed', progress: 136, total: 136, unit: 'pages', rating: 4, startedAt: day(52), completedAt: day(44) }),
    lr({ kind: 'course', title: 'Spanish B1', author: 'Duolingo + tutor', status: 'paused', progress: 40, total: 100, unit: 'percent', startedAt: day(88) }),
    lr({ kind: 'book', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', status: 'planned', progress: 0, total: 499, unit: 'pages' }),
  ];
  for (let d = 30; d >= 1; d--) {
    if (chance(0.55)) {
      const book = d > 10 ? deepWork : pick([deepWork, money]);
      activity({ domain: 'intellectual', kind: 'reading', title: book.title, value: pick([12, 18, 20, 25, 30]), unit: 'pages', details: { resourceId: book.id }, occurredAt: at(day(d), '21:00') });
    }
    if (chance(0.25)) activity({ domain: 'intellectual', kind: 'course', title: ml.title, value: 1, unit: 'lessons', details: { resourceId: ml.id }, occurredAt: at(day(d), '19:00') });
  }
  const notes: [string, string][] = [
    ['Attention residue', 'Switching tasks leaves part of your attention behind. Batch shallow work.'],
    ['Gradient descent intuition', 'Step size too large overshoots; too small crawls. Learning rate schedules help.'],
    ['Reasonable vs rational', 'People make money decisions that are reasonable for their story, not rational on paper.'],
    ['Interview rule', 'Ask about specifics in the past, not opinions about the future.'],
  ];
  notes.forEach(([title, body], i) => activity({ domain: 'intellectual', kind: 'note', title, notes: body, occurredAt: at(day(4 + i * 6), '20:30') }));

  const skill = (s: Omit<Skill, 'id' | 'updatedAt' | 'notes'> & Partial<Skill>): Skill => ({ id: uid(), notes: null, updatedAt: created, ...s });
  const skills: Skill[] = [
    skill({ domain: 'intellectual', name: 'Python', level: 3, targetLevel: 4 }),
    skill({ domain: 'intellectual', name: 'Spanish', level: 2, targetLevel: 4 }),
    skill({ domain: 'intellectual', name: 'Writing', level: 3, targetLevel: 4 }),
    skill({ domain: 'career', name: 'Product strategy', level: 3, targetLevel: 4 }),
    skill({ domain: 'career', name: 'SQL & analytics', level: 3, targetLevel: 5 }),
    skill({ domain: 'career', name: 'Stakeholder management', level: 2, targetLevel: 4 }),
  ];

  /* ───────── Financial ───────── */
  const expenses: Expense[] = [];
  const spend: [string, number, number, string | null][] = [
    ['Food', 9, 28, 'Lunch'],
    ['Groceries', 35, 95, null],
    ['Transport', 4, 45, null],
    ['Shopping', 20, 140, null],
    ['Fun', 12, 60, null],
    ['Health', 15, 60, 'Pharmacy'],
    ['Learning', 10, 40, null],
  ];
  for (let d = DAYS; d >= 0; d--) {
    const n = chance(0.6) ? 1 : chance(0.5) ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const [category, min, max, note] = pick(spend);
      expenses.push({ id: uid(), amount: round(between(min, max), 2), currency: 'USD', category, note, occurredAt: at(day(d), pick(['08:40', '12:30', '18:10'])) });
    }
    const date = day(d);
    if (date.endsWith('-03')) expenses.push({ id: uid(), amount: 1450, currency: 'USD', category: 'Bills', note: 'Rent', occurredAt: at(date, '09:00') });
    if (date.endsWith('-12')) expenses.push({ id: uid(), amount: 64.99, currency: 'USD', category: 'Bills', note: 'Phone + internet', occurredAt: at(date, '09:00') });
  }
  expenses.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const income: Income[] = [];
  for (let m = 0; m < 4; m++) {
    const first = startOfMonth(addDays(startOfMonth(now), -m * 28));
    if (first <= now) income.push({ id: uid(), amount: 5200, currency: 'USD', source: 'Salary', note: null, receivedAt: at(first, '09:00') });
  }
  [[12, 640, 'Freelance', 'Dashboard audit'], [47, 420, 'Freelance', 'Workshop'], [20, 85, 'Business', 'Newsletter sponsor'], [6, 120, 'Business', 'Newsletter sponsor']].forEach(
    ([d, amount, source, note]) => income.push({ id: uid(), amount: amount as number, currency: 'USD', source: source as string, note: note as string, receivedAt: at(day(d as number), '11:00') }),
  );
  income.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  const investments: Investment[] = [
    { id: uid(), name: 'Global index fund', kind: 'funds', investedAmount: 12000, currentValue: 13480, currency: 'USD', valueUpdatedAt: at(day(3), '09:00') },
    { id: uid(), name: 'Retirement account', kind: 'retirement', investedAmount: 24500, currentValue: 27120, currency: 'USD', valueUpdatedAt: at(day(9), '09:00') },
    { id: uid(), name: 'Bitcoin', kind: 'crypto', investedAmount: 1500, currentValue: 1210, currency: 'USD', valueUpdatedAt: at(day(1), '09:00') },
  ];
  for (let m = 3; m >= 0; m--) {
    const date = addDays(now, -m * 30);
    metric('financial', 'savings_balance', 6400 + (3 - m) * 500, 'USD', date, '09:30');
    metric('financial', 'debt_balance', 9800 - (3 - m) * 300, 'USD', date, '09:30');
  }

  /* ───────── Social ───────── */
  const socials = ['Dinner with Sam and Priya', 'Family video call', 'Product meetup', 'Climbing with Leo', 'Coffee with former manager', 'Board games night'];
  for (let d = 84; d >= 1; d -= Math.round(between(3, 7))) {
    activity({ domain: 'social', kind: 'social', title: pick(socials), details: { type: pick(['Friends', 'Family', 'Networking', 'Event']) }, occurredAt: at(day(d), '19:00') });
  }
  for (let d = 77; d >= 2; d -= 7) {
    activity({ domain: 'social', kind: 'speaking', title: pick(['Toastmasters prepared speech', 'Table topics', 'Team demo rehearsal']), value: pick([5, 7, 7, 10]), unit: 'min', notes: pick(['Fewer filler words than last time', 'Rushed the ending', 'Good eye contact, need stronger opening']), details: { rating: pick([3, 3, 4, 4, 5]) }, occurredAt: at(day(d), '18:30') });
  }
  [[9, 'Reached out to Dana from the old team'], [23, 'Thank-you note to mentor'], [51, 'Introduced Ravi to the design lead']].forEach(([d, title]) =>
    activity({ domain: 'social', kind: 'outreach', title: title as string, occurredAt: at(day(d as number), '12:00') }),
  );

  /* ───────── Career ───────── */
  const project = (p: Omit<Project, 'id' | 'updatedAt' | 'description' | 'hypothesis' | 'outcome' | 'startedAt' | 'completedAt'> & Partial<Project>): Project => ({
    id: uid(),
    description: null,
    hypothesis: null,
    outcome: null,
    startedAt: null,
    completedAt: null,
    updatedAt: created,
    ...p,
  });
  const projects: Project[] = [
    project({ domain: 'career', kind: 'project', title: 'Q4 product strategy', description: 'Roadmap and bets for next quarter', status: 'active', startedAt: day(21) }),
    project({ domain: 'career', kind: 'project', title: 'Analytics dashboard revamp', status: 'completed', startedAt: day(80), completedAt: day(33), outcome: 'Weekly active usage up 18%' }),
    project({ domain: 'career', kind: 'project', title: 'Mentoring two junior PMs', status: 'active', startedAt: day(45) }),
    project({ domain: 'entrepreneurship', kind: 'venture', title: 'Indie Founder Weekly', description: 'Newsletter for solo founders', status: 'active', startedAt: day(75) }),
    project({ domain: 'entrepreneurship', kind: 'idea', title: 'Meal-prep planner app', description: 'Plans a week of meals from what is already in the fridge', status: 'idea' }),
    project({ domain: 'entrepreneurship', kind: 'idea', title: 'Template shop for Notion', status: 'idea' }),
    project({ domain: 'entrepreneurship', kind: 'experiment', title: 'Landing page smoke test', hypothesis: '30+ sign-ups from 1,000 visitors means real interest in the meal planner', outcome: '41 sign-ups from 1,120 visitors. Worth interviewing.', status: 'completed', startedAt: day(30), completedAt: day(16) }),
    project({ domain: 'entrepreneurship', kind: 'experiment', title: 'Paid tier at $6/month', hypothesis: '5% of newsletter readers upgrade within a month', status: 'active', startedAt: day(8) }),
  ];
  [[33, 'achievement', 'Shipped the analytics dashboard revamp'], [12, 'achievement', 'Presented roadmap to leadership'], [58, 'milestone', 'Took ownership of the growth squad'], [5, 'milestone', 'First 1:1s with mentees completed']].forEach(([d, kind, title]) =>
    activity({ domain: 'career', kind: kind as string, title: title as string, occurredAt: at(day(d as number), '16:00') }),
  );

  /* ───────── Entrepreneurship ───────── */
  [[64, 40], [41, 120], [20, 205], [6, 340]].forEach(([d, mrr]) =>
    activity({ domain: 'entrepreneurship', kind: 'revenue', title: `Reached $${mrr} MRR`, value: mrr!, unit: 'USD', occurredAt: at(day(d!), '10:00') }),
  );
  activity({ domain: 'entrepreneurship', kind: 'milestone', title: '1,000 newsletter subscribers', occurredAt: at(day(27), '09:00') });

  /* ───────── Goals ───────── */
  const goal = (g: Omit<Goal, 'id' | 'createdAt' | 'description' | 'category' | 'startValue' | 'targetDate' | 'status' | 'unit'> & Partial<Goal>): Goal => ({
    id: uid(),
    createdAt: created,
    description: null,
    category: null,
    startValue: null,
    targetDate: null,
    status: 'active',
    unit: null,
    ...g,
  });
  const latestWeight = weight[0]!.value;
  const goals: Goal[] = [
    goal({ domain: 'physical', title: 'Reach 76 kg', startValue: 82.6, currentValue: latestWeight, targetValue: 76, unit: 'kg', targetDate: addDays(now, 70) }),
    goal({ domain: 'physical', title: 'Run a sub-50 minute 10K', currentValue: 0, targetValue: null, targetDate: addDays(now, 90) }),
    goal({ domain: 'physical', title: 'Train 3 times a week', currentValue: 9, targetValue: 12, unit: 'sessions', description: 'This month' }),
    goal({ domain: 'mental', title: 'Meditate 100 days', currentValue: 54, targetValue: 100, unit: 'days' }),
    goal({ domain: 'mental', title: 'Two deep-work blocks every weekday', currentValue: 0, targetValue: null }),
    goal({ domain: 'intellectual', title: 'Read 24 books this year', currentValue: 17, targetValue: 24, unit: 'books', category: 'learning' }),
    goal({ domain: 'intellectual', title: 'Finish the ML specialization', currentValue: 14, targetValue: 32, unit: 'lessons', category: 'learning', targetDate: addDays(now, 60) }),
    goal({ domain: 'financial', title: 'Emergency fund', startValue: 0, currentValue: 7900, targetValue: 10000, unit: 'USD' }),
    goal({ domain: 'financial', title: 'Pay off student loan', startValue: 12000, currentValue: 8900, targetValue: 0, unit: 'USD' }),
    goal({ domain: 'social', title: 'Give 5 talks this year', currentValue: 2, targetValue: 5, unit: 'talks', category: 'public_speaking' }),
    goal({ domain: 'social', title: 'Call a close friend every week', currentValue: 31, targetValue: 52, unit: 'weeks', category: 'relationships' }),
    goal({ domain: 'social', title: 'Speak up first in team meetings', currentValue: 0, targetValue: null, category: 'communication' }),
    goal({ domain: 'career', title: 'Lead a cross-team project', currentValue: 0, targetValue: null, category: 'professional' }),
    goal({ domain: 'career', title: 'Promotion to Senior PM', currentValue: 0, targetValue: null, category: 'professional', targetDate: addDays(now, 160) }),
    goal({ domain: 'entrepreneurship', title: 'First $1,000 MRR', startValue: 0, currentValue: 340, targetValue: 1000, unit: 'USD', category: 'revenue' }),
    goal({ domain: 'entrepreneurship', title: 'Interview 20 meal-prep users', currentValue: 7, targetValue: 20, unit: 'interviews', category: 'validation' }),
  ];
  // Progress history for a few goals.
  const g = (title: string) => goals.find((x) => x.title === title)!;
  [[60, 6100], [30, 7200], [2, 7900]].forEach(([d, v]) =>
    activities.push({ id: uid(), domain: 'financial', kind: 'goal_progress', title: 'Emergency fund', value: v!, unit: 'USD', notes: null, details: {}, goalId: g('Emergency fund').id, occurredAt: at(day(d!), '09:00') }),
  );
  [[55, 3], [36, 9], [20, 14], [3, 17]].forEach(([d, v]) =>
    activities.push({ id: uid(), domain: 'intellectual', kind: 'goal_progress', title: 'Read 24 books this year', value: v!, unit: 'books', notes: null, details: {}, goalId: g('Read 24 books this year').id, occurredAt: at(day(d!), '09:00') }),
  );
  activities.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  metrics.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  /* ───────── Reflections ───────── */
  const reflections: Reflection[] = [];
  const reflection = (r: Omit<Reflection, 'id' | 'updatedAt' | 'domainRatings' | 'goalIds' | 'mood' | 'energy'> & Partial<Reflection>) =>
    reflections.push({ id: uid(), updatedAt: at(r.periodStart, '21:45'), domainRatings: {}, goalIds: [], mood: null, energy: null, ...r });
  reflection({
    period: 'daily',
    periodStart: day(1),
    mood: 4,
    energy: 3,
    responses: {
      went_well: 'Protected two hours for the strategy doc and got the outline done.',
      accomplished: 'Strategy outline, 25 pages of Deep Work, strength session.',
      incomplete: 'Didn’t send the client invoice.',
      distractions: 'Slack during the afternoon block.',
      improve: 'Send the invoice before 10am. Slack closed until lunch.',
    },
  });
  reflection({
    period: 'daily',
    periodStart: day(2),
    mood: 3,
    energy: 2,
    responses: { went_well: 'Good conversation with my mentee.', incomplete: 'Skipped the run, slept badly.', improve: 'Phone out of the bedroom.' },
  });
  const lastWeek = startOfWeek(addDays(now, -7));
  reflection({
    period: 'weekly',
    periodStart: lastWeek,
    responses: {
      achievements: 'Presented the roadmap to leadership. Newsletter passed $300 MRR.',
      missed: 'Two runs and the client invoice.',
      consistency: 'Meditation every day. Journaling dropped off mid-week.',
      challenges: 'Meetings ate the afternoons.',
      lessons: 'Deep work only happens when it is in the calendar.',
      priorities: 'Finish Q4 strategy draft, run twice, ship paid-tier test.',
    },
    domainRatings: { physical: 3, mental: 4, intellectual: 4, financial: 3, social: 3, career: 5, entrepreneurship: 4 },
    goalIds: [g('First $1,000 MRR').id, g('Reach 76 kg').id],
  });
  const lastMonth = startOfMonth(addDays(startOfMonth(now), -1));
  reflection({
    period: 'monthly',
    periodStart: lastMonth,
    mood: 4,
    responses: {
      overall: 'Solid month. Work momentum was high; health slipped in the last week.',
      achievements: 'Shipped the analytics revamp. 1,000 newsletter subscribers.',
      attention: 'Social life and Spanish practice.',
      priorities: 'Q4 strategy, paid tier experiment, three workouts a week.',
    },
    domainRatings: { physical: 3, mental: 4, intellectual: 3, financial: 4, social: 2, career: 5, entrepreneurship: 4 },
  });

  return {
    profile: { id: 'demo', displayName: null, weightUnit: 'kg', currency: 'USD', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    tasks,
    habits,
    habitLogs,
    goals,
    metrics,
    activities,
    weight,
    workouts,
    expenses,
    income,
    investments,
    learning,
    skills,
    projects,
    healthReports,
    files,
    reflections,
    conversations: [],
    messages: [],
  };
}
