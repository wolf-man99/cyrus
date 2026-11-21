import { describe, expect, it } from 'vitest';
import { addDays, today } from '@/lib/dates';
import { createDemoRepository } from './demoRepository';

describe('demo repository', () => {
  it('lists today’s tasks including overdue open ones, sorted by time', async () => {
    const repo = createDemoRepository({ latencyMs: 0 });
    const tasks = await repo.tasks.listForDay(today());
    expect(tasks.some((t) => t.dueDate! < today() && !t.completedAt)).toBe(true);
    const times = tasks.map((t) => t.dueTime).filter(Boolean) as string[];
    expect([...times].sort()).toEqual(times);
  });

  it('only lists future incomplete tasks as upcoming', async () => {
    const repo = createDemoRepository({ latencyMs: 0 });
    const upcoming = await repo.tasks.listUpcoming(today(), 7);
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming.every((t) => t.dueDate! > today() && t.dueDate! <= addDays(today(), 7))).toBe(true);
  });

  it('toggles habit completion idempotently', async () => {
    const repo = createDemoRepository({ latencyMs: 0 });
    const [habit] = await repo.habits.list();
    const count = async () => (await repo.habits.logsBetween(today(), today())).filter((l) => l.habitId === habit!.id).length;
    await repo.habits.setDone(habit!.id, today(), false);
    expect(await count()).toBe(0);
    await repo.habits.setDone(habit!.id, today(), true);
    await repo.habits.setDone(habit!.id, today(), true);
    expect(await count()).toBe(1);
  });

  it('returns copies so callers cannot mutate the store', async () => {
    const repo = createDemoRepository({ latencyMs: 0 });
    const [task] = await repo.tasks.listForDay(today());
    task!.title = 'mutated';
    const [again] = await repo.tasks.listForDay(today());
    expect(again!.title).not.toBe('mutated');
  });

  it('newest weight entry comes first', async () => {
    const repo = createDemoRepository({ latencyMs: 0 });
    await repo.weight.create({ value: 77.9, unit: 'kg' });
    const [latest] = await repo.weight.list();
    expect(latest!.value).toBe(77.9);
  });
});
