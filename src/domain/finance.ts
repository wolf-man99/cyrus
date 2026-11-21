import { dateOf, startOfMonth, type ISODate } from '@/lib/dates';
import type { DomainMetric, Expense, Income, Investment } from './types';

export interface MonthSummary {
  month: ISODate; // first day of the month
  income: number;
  expenses: number;
  net: number;
  /** Share of income kept, 0..1, or null with no income. */
  savingsRate: number | null;
  topCategories: { category: string; total: number }[];
}

/** Income vs spending per calendar month, newest first. */
export function monthlySummaries(expenses: Expense[], income: Income[]): MonthSummary[] {
  const months = new Map<ISODate, { income: number; expenses: number; categories: Map<string, number> }>();
  const get = (m: ISODate) => {
    let entry = months.get(m);
    if (!entry) months.set(m, (entry = { income: 0, expenses: 0, categories: new Map() }));
    return entry;
  };
  for (const e of expenses) {
    const m = get(startOfMonth(dateOf(e.occurredAt)));
    m.expenses += e.amount;
    m.categories.set(e.category, (m.categories.get(e.category) ?? 0) + e.amount);
  }
  for (const i of income) get(startOfMonth(dateOf(i.receivedAt))).income += i.amount;

  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, m]) => ({
      month,
      income: round2(m.income),
      expenses: round2(m.expenses),
      net: round2(m.income - m.expenses),
      savingsRate: m.income > 0 ? (m.income - m.expenses) / m.income : null,
      topCategories: [...m.categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, total]) => ({ category, total: round2(total) })),
    }));
}

export interface NetWorth {
  investments: number;
  savings: number | null;
  debt: number | null;
  total: number;
}

/** Net worth from investments plus the latest savings and debt balances (metrics). */
export function netWorth(investments: Investment[], metrics: DomainMetric[]): NetWorth {
  const latest = (name: string) =>
    metrics.filter((m) => m.metric === name).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]?.value ?? null;
  const invested = investments.reduce((s, i) => s + i.currentValue, 0);
  const savings = latest('savings_balance');
  const debt = latest('debt_balance');
  return { investments: round2(invested), savings, debt, total: round2(invested + (savings ?? 0) - (debt ?? 0)) };
}

export function sumBy<T>(items: T[], value: (item: T) => number): number {
  return round2(items.reduce((s, i) => s + value(i), 0));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
