import { describe, expect, it } from 'vitest';
import { goalProgress } from './goals';
import { bucketSum, trend } from './series';
import { monthlySummaries, netWorth } from './finance';
import { summarizePeriod } from './summary';
import { createDemoState } from '@/data/demo/seed';
import { addDays, endOfMonth, periodRange, startOfMonth, startOfWeek } from '@/lib/dates';

const g = (startValue: number | null, currentValue: number, targetValue: number | null) => ({
  startValue,
  currentValue,
  targetValue,
  status: 'active' as const,
});

describe('goalProgress', () => {
  it('measures count-up goals', () => expect(goalProgress(g(null, 17, 24))).toBeCloseTo(17 / 24));
  it('measures count-down goals from their start', () => {
    expect(goalProgress(g(82.6, 78.3, 76))).toBeCloseTo((82.6 - 78.3) / (82.6 - 76));
    expect(goalProgress(g(12000, 8900, 0))).toBeCloseTo(3100 / 12000);
  });
  it('clamps and handles milestones', () => {
    expect(goalProgress(g(0, 1200, 1000))).toBe(1);
    expect(goalProgress(g(null, 0, null))).toBeNull();
    expect(goalProgress({ ...g(null, 0, null), status: 'completed' })).toBe(1);
  });
  it('refuses to guess a countdown goal with no start', () => expect(goalProgress(g(null, 80, 76))).toBeNull());
});

describe('dates for periods', () => {
  it('weeks start on Monday', () => {
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16'); // Sunday → Monday before
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
  });
  it('month boundaries', () => {
    expect(startOfMonth('2026-02-17')).toBe('2026-02-01');
    expect(endOfMonth('2028-02-03')).toBe('2028-02-29');
    expect(periodRange('weekly', '2026-11-16')).toEqual({ from: '2026-11-16', to: '2026-11-22' });
  });
});

describe('series', () => {
  it('buckets by week and keeps empty weeks', () => {
    const items = [
      { d: '2026-11-02T10:00:00', v: 3 },
      { d: '2026-11-03T10:00:00', v: 2 },
      { d: '2026-11-17T10:00:00', v: 5 },
    ];
    const points = bucketSum(items, (i) => i.d, (i) => i.v, 'week', { from: '2026-11-02', to: '2026-11-22' });
    expect(points.map((p) => p.value)).toEqual([5, 0, 5]);
  });
  it('summarises a trend', () => {
    expect(trend([{ date: 'a', value: 80 }, { date: 'b', value: 78.5 }])).toMatchObject({ change: -1.5, min: 78.5 });
  });
});

describe('finance', () => {
  it('summarises months newest first with savings rate', () => {
    const months = monthlySummaries(
      [{ id: '1', amount: 100, currency: 'USD', category: 'Food', note: null, occurredAt: '2026-10-05T12:00:00Z' }],
      [{ id: '2', amount: 1000, currency: 'USD', source: 'Salary', note: null, receivedAt: '2026-10-01T12:00:00Z' }],
    );
    expect(months[0]).toMatchObject({ month: '2026-10-01', income: 1000, expenses: 100, net: 900, savingsRate: 0.9 });
  });
  it('computes net worth from investments and latest balances', () => {
    const nw = netWorth(
      [{ id: 'i', name: 'Fund', kind: 'funds', investedAmount: 1000, currentValue: 1200, currency: 'USD', valueUpdatedAt: '' }],
      [
        { id: 'a', domain: 'financial', metric: 'savings_balance', value: 500, unit: 'USD', note: null, recordedAt: '2026-01-01T00:00:00Z' },
        { id: 'b', domain: 'financial', metric: 'savings_balance', value: 800, unit: 'USD', note: null, recordedAt: '2026-02-01T00:00:00Z' },
        { id: 'c', domain: 'financial', metric: 'debt_balance', value: 300, unit: 'USD', note: null, recordedAt: '2026-02-01T00:00:00Z' },
      ],
    );
    expect(nw).toEqual({ investments: 1200, savings: 800, debt: 300, total: 1700 });
  });
});

describe('summarizePeriod', () => {
  it('summarises the demo’s last full week', () => {
    const now = '2026-11-21';
    const s = createDemoState(now);
    const from = startOfWeek(addDays(now, -7));
    const summary = summarizePeriod({ ...s, metrics: s.metrics }, from, addDays(from, 6), now);
    expect(summary.days).toBe(7);
    expect(summary.tasks.total).toBeGreaterThan(0);
    expect(summary.habits.overallRate).toBeGreaterThan(0.3);
    expect(summary.workouts.count).toBeGreaterThan(0);
    expect(summary.money.spent).toBeGreaterThan(0);
    expect(summary.mood).not.toBeNull();
    expect(Object.keys(summary.domains)).toHaveLength(7);
  });
  it('only counts days elapsed in a current period', () => {
    const now = '2026-11-19'; // Thursday
    const s = createDemoState(now);
    const from = startOfWeek(now);
    expect(summarizePeriod(s, from, addDays(from, 6), now).days).toBe(4);
  });
});
