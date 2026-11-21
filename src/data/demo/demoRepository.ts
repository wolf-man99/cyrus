import { addDays, dateOf } from '@/lib/dates';
import { uid } from '@/lib/id';
import { CARRY_OVER_DAYS } from '@/domain/tasks';
import type { Reflection, Task } from '@/domain/types';
import type { DateRange, Repository } from '../repository';
import { createDemoState, type DemoState } from './seed';

const byTime = (a: Task, b: Task) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99');
const byDue = (a: Task, b: Task) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || byTime(a, b);

/** True when a timestamp's local date falls inside the range. */
function inRange(timestamp: string, range?: DateRange): boolean {
  const date = dateOf(timestamp);
  return (!range?.from || date >= range.from) && (!range?.to || date <= range.to);
}

function limit<T>(items: T[], n?: number): T[] {
  return n ? items.slice(0, n) : items;
}

function find<T extends { id: string }>(items: T[], id: string, what: string): T {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`${what} not found`);
  return item;
}

/**
 * In-memory repository for DEMO MODE.
 * Data lives only in this browser tab and resets on reload — the UI says so wherever it matters.
 */
export function createDemoRepository(options: { latencyMs?: number; state?: DemoState } = {}): Repository {
  const s = options.state ?? createDemoState();
  const latency = options.latencyMs ?? 120;
  const wait = <T>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latency));
  const fail = (message: string) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), latency));
  const now = () => new Date().toISOString();

  return {
    mode: 'demo',

    profile: {
      get: () => wait(s.profile),
      update(patch) {
        Object.assign(s.profile, patch);
        return wait(s.profile);
      },
    },

    tasks: {
      listForDay(date) {
        const oldest = addDays(date, -CARRY_OVER_DAYS);
        const due = s.tasks.filter(
          (t) => t.dueDate === date || (t.dueDate !== null && t.dueDate < date && t.dueDate >= oldest && t.completedAt === null),
        );
        return wait(due.sort(byTime));
      },
      listUpcoming(date, days) {
        const end = addDays(date, days);
        return wait(
          s.tasks.filter((t) => t.dueDate !== null && t.dueDate > date && t.dueDate <= end && t.completedAt === null).sort(byDue),
        );
      },
      listBetween(from, to) {
        return wait(s.tasks.filter((t) => t.dueDate !== null && t.dueDate >= from && t.dueDate <= to).sort(byDue));
      },
      search(query, n = 20) {
        const q = query.trim().toLowerCase();
        const hits = s.tasks
          .filter((t) => t.title.toLowerCase().includes(q))
          .sort((a, b) => Number(a.completedAt !== null) - Number(b.completedAt !== null) || byDue(b, a));
        return wait(hits.slice(0, n));
      },
      create(input) {
        const t: Task = { id: uid(), createdAt: now(), completedAt: null, ...input };
        s.tasks.push(t);
        return wait(t);
      },
      update(id, patch) {
        const t = find(s.tasks, id, 'Task');
        Object.assign(t, patch);
        return wait(t);
      },
      setCompleted(id, completed) {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return fail('Task not found');
        t.completedAt = completed ? now() : null;
        return wait(t);
      },
      remove(id) {
        s.tasks = s.tasks.filter((t) => t.id !== id);
        return wait(undefined);
      },
    },

    habits: {
      list: () => wait([...s.habits].sort((a, b) => a.sortOrder - b.sortOrder)),
      create(input) {
        const h = { id: uid(), createdAt: now(), sortOrder: s.habits.length, ...input };
        s.habits.push(h);
        return wait(h);
      },
      archive(id) {
        s.habits = s.habits.filter((h) => h.id !== id);
        return wait(undefined);
      },
      logsBetween(from, to) {
        return wait(s.habitLogs.filter((l) => l.logDate >= from && l.logDate <= to));
      },
      setDone(habitId, date, done) {
        const exists = s.habitLogs.some((l) => l.habitId === habitId && l.logDate === date);
        if (done && !exists) s.habitLogs.push({ id: uid(), habitId, logDate: date });
        if (!done) s.habitLogs = s.habitLogs.filter((l) => !(l.habitId === habitId && l.logDate === date));
        return wait(undefined);
      },
    },

    goals: {
      list(filter) {
        return wait(
          s.goals.filter(
            (g) => (!filter?.domain || g.domain === filter.domain) && (filter?.includeArchived || g.status !== 'archived'),
          ),
        );
      },
      create(input) {
        const g = { id: uid(), createdAt: now(), status: 'active' as const, ...input };
        s.goals.push(g);
        return wait(g);
      },
      update(id, patch) {
        const g = s.goals.find((x) => x.id === id);
        if (!g) return fail('Goal not found');
        // Mirrors the database trigger that records progress history.
        if (patch.currentValue !== undefined && patch.currentValue !== g.currentValue) {
          s.activities.unshift({
            id: uid(),
            domain: g.domain,
            kind: 'goal_progress',
            title: patch.title ?? g.title,
            value: patch.currentValue,
            unit: patch.unit ?? g.unit,
            notes: null,
            details: {},
            goalId: g.id,
            occurredAt: now(),
          });
        }
        Object.assign(g, patch);
        return wait(g);
      },
    },

    metrics: {
      list(filter) {
        return wait(
          limit(
            s.metrics.filter(
              (m) =>
                (!filter?.domain || m.domain === filter.domain) &&
                (!filter?.metrics || filter.metrics.includes(m.metric)) &&
                inRange(m.recordedAt, filter),
            ),
            filter?.limit,
          ),
        );
      },
      record(input) {
        const m = { id: uid(), recordedAt: now(), ...input };
        s.metrics.unshift(m);
        s.metrics.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
        return wait(m);
      },
      remove(id) {
        s.metrics = s.metrics.filter((m) => m.id !== id);
        return wait(undefined);
      },
    },

    activities: {
      list(filter) {
        return wait(
          limit(
            s.activities.filter(
              (a) =>
                (!filter?.domain || a.domain === filter.domain) &&
                (!filter?.kinds || filter.kinds.includes(a.kind)) &&
                (!filter?.goalId || a.goalId === filter.goalId) &&
                inRange(a.occurredAt, filter),
            ),
            filter?.limit,
          ),
        );
      },
      create(input) {
        const a = { id: uid(), occurredAt: now(), ...input };
        s.activities.unshift(a);
        s.activities.sort((x, y) => y.occurredAt.localeCompare(x.occurredAt));
        return wait(a);
      },
      remove(id) {
        s.activities = s.activities.filter((a) => a.id !== id);
        return wait(undefined);
      },
    },

    weight: {
      list: (range) => wait(limit(s.weight.filter((w) => inRange(w.loggedAt, range)), range?.limit)),
      create(input) {
        const w = { id: uid(), loggedAt: now(), ...input };
        s.weight.unshift(w);
        return wait(w);
      },
      remove(id) {
        s.weight = s.weight.filter((w) => w.id !== id);
        return wait(undefined);
      },
    },

    workouts: {
      list: (range) => wait(limit(s.workouts.filter((w) => inRange(w.performedAt, range)), range?.limit)),
      create(input) {
        const w = { id: uid(), performedAt: now(), ...input };
        s.workouts.unshift(w);
        return wait(w);
      },
      remove(id) {
        s.workouts = s.workouts.filter((w) => w.id !== id);
        return wait(undefined);
      },
    },

    expenses: {
      list: (range) => wait(limit(s.expenses.filter((e) => inRange(e.occurredAt, range)), range?.limit)),
      create(input) {
        const e = { id: uid(), ...input, occurredAt: input.occurredAt ?? now() };
        s.expenses.unshift(e);
        s.expenses.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
        return wait(e);
      },
      remove(id) {
        s.expenses = s.expenses.filter((e) => e.id !== id);
        return wait(undefined);
      },
    },

    income: {
      list: (range) => wait(limit(s.income.filter((i) => inRange(i.receivedAt, range)), range?.limit)),
      create(input) {
        const i = { id: uid(), ...input, receivedAt: input.receivedAt ?? now() };
        s.income.unshift(i);
        s.income.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
        return wait(i);
      },
      remove(id) {
        s.income = s.income.filter((i) => i.id !== id);
        return wait(undefined);
      },
    },

    investments: {
      list: () => wait(s.investments),
      create(input) {
        const inv = { id: uid(), valueUpdatedAt: now(), ...input };
        s.investments.push(inv);
        return wait(inv);
      },
      update(id, patch) {
        const inv = find(s.investments, id, 'Investment');
        Object.assign(inv, patch, patch.currentValue !== undefined ? { valueUpdatedAt: now() } : {});
        return wait(inv);
      },
      archive(id) {
        s.investments = s.investments.filter((i) => i.id !== id);
        return wait(undefined);
      },
    },

    learning: {
      list: () => wait(s.learning),
      create(input) {
        const r = {
          id: uid(),
          updatedAt: now(),
          startedAt: input.status === 'active' ? dateOf(now()) : null,
          completedAt: input.status === 'completed' ? dateOf(now()) : null,
          ...input,
        };
        s.learning.unshift(r);
        return wait(r);
      },
      update(id, patch) {
        const r = find(s.learning, id, 'Resource');
        if (patch.status === 'completed' && r.status !== 'completed') r.completedAt = dateOf(now());
        if (patch.status === 'active' && !r.startedAt) r.startedAt = dateOf(now());
        Object.assign(r, patch, { updatedAt: now() });
        return wait(r);
      },
    },

    skills: {
      list: (domain) => wait(s.skills.filter((k) => !domain || k.domain === domain)),
      create(input) {
        const k = { id: uid(), updatedAt: now(), ...input };
        s.skills.push(k);
        return wait(k);
      },
      update(id, patch) {
        const k = find(s.skills, id, 'Skill');
        Object.assign(k, patch, { updatedAt: now() });
        return wait(k);
      },
      archive(id) {
        s.skills = s.skills.filter((k) => k.id !== id);
        return wait(undefined);
      },
    },

    projects: {
      list: (domain) => wait(s.projects.filter((p) => !domain || p.domain === domain)),
      create(input) {
        const p = {
          id: uid(),
          updatedAt: now(),
          startedAt: input.status === 'active' ? dateOf(now()) : null,
          completedAt: null,
          ...input,
        };
        s.projects.unshift(p);
        return wait(p);
      },
      update(id, patch) {
        const p = find(s.projects, id, 'Project');
        if (patch.status === 'completed' && p.status !== 'completed') p.completedAt = dateOf(now());
        if (patch.status === 'active' && !p.startedAt) p.startedAt = dateOf(now());
        Object.assign(p, patch, { updatedAt: now() });
        return wait(p);
      },
    },

    healthReports: {
      list: () => wait(s.healthReports),
      async upload(file, meta) {
        const path = `demo/${uid()}-${file.name}`;
        s.files[path] = URL.createObjectURL(file);
        const r = {
          id: uid(),
          storagePath: path,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          createdAt: now(),
          ...meta,
        };
        s.healthReports.unshift(r);
        return wait(r);
      },
      async fileUrl(report) {
        const url = s.files[report.storagePath];
        if (!url) throw new Error('File not found');
        return url;
      },
      remove(report) {
        const url = s.files[report.storagePath];
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
        delete s.files[report.storagePath];
        s.healthReports = s.healthReports.filter((r) => r.id !== report.id);
        return wait(undefined);
      },
    },

    reflections: {
      list(period, n = 60) {
        return wait(
          limit(
            s.reflections
              .filter((r) => !period || r.period === period)
              .sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
            n,
          ),
        );
      },
      get(period, start) {
        return wait(s.reflections.find((r) => r.period === period && r.periodStart === start) ?? null);
      },
      save(input) {
        const existing = s.reflections.find((r) => r.period === input.period && r.periodStart === input.periodStart);
        const saved: Reflection = { id: existing?.id ?? uid(), ...input, updatedAt: now() };
        s.reflections = [saved, ...s.reflections.filter((r) => r !== existing)];
        return wait(saved);
      },
    },

    conversations: {
      list: (n = 20) => wait(limit([...s.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), n)),
      create(title = null) {
        const c = { id: uid(), title, startedAt: now(), updatedAt: now(), endedAt: null };
        s.conversations.push(c);
        return wait(c);
      },
      messages(conversationId, n = 100) {
        return wait(s.messages.filter((m) => m.conversationId === conversationId).slice(-n));
      },
      append(conversationId, message) {
        const c = s.conversations.find((x) => x.id === conversationId);
        if (!c) return fail('Conversation not found');
        const m = { id: uid(), conversationId, actions: [], ...message, createdAt: now() };
        s.messages.push(m);
        c.updatedAt = m.createdAt;
        if (!c.title && message.role === 'user') c.title = message.content.slice(0, 80);
        return wait(m);
      },
      end(conversationId) {
        const c = s.conversations.find((x) => x.id === conversationId);
        if (c) c.endedAt = now();
        return wait(undefined);
      },
    },
  };
}

