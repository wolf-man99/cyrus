import { describe, expect, it } from 'vitest';
import { computeStreak, withHabitState } from './habits';
import { dailyProgress } from './progress';
import type { Habit, Task } from './types';

describe('computeStreak', () => {
  it('counts back from today when done today', () => {
    expect(computeStreak(new Set(['2026-11-21', '2026-11-20', '2026-11-19']), '2026-11-21')).toBe(3);
  });
  it('keeps yesterday’s streak alive while today is open', () => {
    expect(computeStreak(new Set(['2026-11-20', '2026-11-19']), '2026-11-21')).toBe(2);
  });
  it('breaks on a gap', () => {
    expect(computeStreak(new Set(['2026-11-21', '2026-11-19']), '2026-11-21')).toBe(1);
    expect(computeStreak(new Set(), '2026-11-21')).toBe(0);
  });
});

describe('dailyProgress', () => {
  const habit: Habit = { id: 'h', title: 'Read', icon: 'book-open', domain: null, sortOrder: 0, createdAt: '' };
  const task = (done: boolean): Task => ({
    id: Math.random().toString(),
    title: 't',
    notes: null,
    domain: null,
    dueDate: '2026-11-21',
    dueTime: null,
    isPriority: false,
    completedAt: done ? 'x' : null,
    createdAt: '',
  });

  it('combines tasks and habits', () => {
    const habits = withHabitState([habit], [{ id: 'l', habitId: 'h', logDate: '2026-11-21' }], '2026-11-21');
    expect(dailyProgress([task(true), task(false), task(false)], habits)).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('is zero, not NaN, for an empty day', () => {
    expect(dailyProgress([], []).ratio).toBe(0);
  });
});
