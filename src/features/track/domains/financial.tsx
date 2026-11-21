import { Landmark, PiggyBank, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { useActivities, useExpenses, useIncome, useInvestments, useMetrics } from '@/data/hooks/useData';
import type { Repository } from '@/data/repository';
import { BarChart } from '@/components/charts/BarChart';
import { bucketSum } from '@/domain/series';
import { monthlySummaries, netWorth } from '@/domain/finance';
import type { Investment } from '@/domain/types';
import { addMonths, dateOf, startOfMonth, today, timeAgo } from '@/lib/dates';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile, signed } from '../components/StatTile';
import { activityItems, type HistoryItem } from '../history';
import { combine, money, previousRange, type DomainModule, type DomainViewProps } from './types';

const total = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);

function Metrics({ range, currency }: DomainViewProps) {
  const prev = previousRange(range);
  const expenses = useExpenses({ from: prev.from, to: range.to });
  const income = useIncome({ from: range.from, to: range.to });
  const investments = useInvestments();
  const balances = useMetrics({ domain: 'financial', metrics: ['savings_balance', 'debt_balance'], limit: 20 });
  const spent = total((expenses.data ?? []).filter((e) => dateOf(e.occurredAt) >= range.from));
  const spentBefore = total((expenses.data ?? []).filter((e) => dateOf(e.occurredAt) < range.from));
  const earned = total(income.data ?? []);
  const worth = investments.data && balances.data ? netWorth(investments.data, balances.data) : null;
  const rate = earned > 0 ? (earned - spent) / earned : null;

  return (
    <StatGrid>
      <StatTile
        label="Net worth"
        value={worth ? money(worth.total, currency, true) : '—'}
        hint={worth ? `${money(worth.investments, currency, true)} invested` : undefined}
      />
      <StatTile
        label="Spent"
        value={expenses.data ? money(spent, currency, true) : '—'}
        change={expenses.data && spentBefore > 0 ? { text: `${signed(((spent - spentBefore) / spentBefore) * 100, 0, '%')} vs previous`, tone: spent <= spentBefore ? 'good' : 'bad' } : null}
      />
      <StatTile label="Earned" value={income.data ? money(earned, currency, true) : '—'} hint={`${income.data?.length ?? 0} payments`} />
      <StatTile
        label="Savings rate"
        value={rate !== null ? formatPercent(Math.max(0, rate)) : '—'}
        change={rate !== null && rate < 0 ? { text: 'Spending exceeded income', tone: 'bad' } : null}
        hint={rate === null ? 'Log income to see it' : `of income kept in ${range.label}`}
      />
    </StatGrid>
  );
}

function Progress({ range, currency }: DomainViewProps) {
  const expenses = useExpenses({ from: range.from, to: range.to });
  const income = useIncome({ from: range.from, to: range.to });
  if (expenses.isPending || income.isPending) return <ChartEmpty>Loading…</ChartEmpty>;
  if (!expenses.data?.length && !income.data?.length) return <ChartEmpty>Log income and expenses to compare them</ChartEmpty>;
  const bucket = range.days <= 31 ? 'week' : 'month';
  const r = { from: range.from, to: range.to };
  return (
    <BarChart
      series={[
        { label: 'Income', color: 'var(--color-financial)', points: bucketSum(income.data ?? [], (i) => i.receivedAt, (i) => i.amount, bucket, r) },
        { label: 'Spending', color: 'var(--color-subtle)', points: bucketSum(expenses.data ?? [], (e) => e.occurredAt, (e) => e.amount, bucket, r) },
      ]}
      bucket={bucket}
      format={(v) => money(v, currency, true)}
      label={`Income and spending over the ${range.label}`}
    />
  );
}

function Collections({ range, currency, open }: DomainViewProps) {
  const investments = useInvestments();
  const from = addMonths(startOfMonth(today()), -5);
  const expenses = useExpenses({ from, to: today() });
  const income = useIncome({ from, to: today() });
  const spending = useExpenses({ from: range.from, to: range.to });
  const months = expenses.data && income.data ? monthlySummaries(expenses.data, income.data).slice(0, 6) : [];
  const categories = new Map<string, number>();
  for (const e of spending.data ?? []) categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount);
  const cats = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const max = cats[0]?.[1] ?? 1;
  const monthName = (iso: string) => new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(`${iso}T12:00:00`));

  return (
    <div className="space-y-9">
      <Collection<Investment>
        id="investments-heading"
        title="Investments"
        onAdd={() => open({ type: 'investment' })}
        query={investments}
        empty={{ title: 'No investments tracked', description: 'Add accounts or holdings and update their value now and then' }}
        render={(items) => (
          <ul className="divide-y divide-line overflow-hidden rounded-row border border-line bg-surface/75">
            {items.map((i) => {
              const gain = i.investedAmount > 0 ? (i.currentValue - i.investedAmount) / i.investedAmount : null;
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => open({ type: 'investment', investment: i })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-callout font-medium">{i.name}</span>
                      <span className="block text-footnote text-muted">
                        {i.kind[0]!.toUpperCase() + i.kind.slice(1)} · updated {timeAgo(i.valueUpdatedAt)}
                      </span>
                    </span>
                    <span className="text-right tabular">
                      <span className="block text-callout">{money(i.currentValue, i.currency)}</span>
                      {gain !== null && (
                        <span className={cn('block text-footnote', gain >= 0 ? 'text-success' : 'text-danger')}>{signed(gain * 100, 1, '%')}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      />

      {cats.length > 0 && (
        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="px-1 text-subhead font-medium text-muted">
            Spending by category · {range.label}
          </h2>
          <table className="mt-2 w-full overflow-hidden rounded-row border border-line bg-surface/75 text-left">
            <tbody className="divide-y divide-line">
              {cats.map(([category, sum]) => (
                <tr key={category}>
                  <th scope="row" className="w-28 py-2.5 pl-4 text-subhead font-normal">
                    {category}
                  </th>
                  <td className="px-3 py-2.5">
                    <div className="h-1.5 rounded-full bg-financial" style={{ width: `${Math.max(3, (sum / max) * 100)}%` }} />
                  </td>
                  <td className="w-24 py-2.5 pr-4 text-right text-subhead text-muted tabular">{money(sum, currency, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {months.length > 0 && (
        <section aria-labelledby="months-heading">
          <h2 id="months-heading" className="px-1 text-subhead font-medium text-muted">
            Monthly summaries
          </h2>
          <div className="mt-2 overflow-x-auto rounded-row border border-line bg-surface/75">
            <table className="w-full min-w-[28rem] text-left text-subhead tabular">
              <thead className="text-footnote text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pl-4 font-medium">Month</th>
                  <th className="py-2.5 text-right font-medium">Income</th>
                  <th className="py-2.5 text-right font-medium">Spent</th>
                  <th className="py-2.5 text-right font-medium">Net</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Kept</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {months.map((m) => (
                  <tr key={m.month}>
                    <th scope="row" className="py-2.5 pl-4 font-medium">
                      {monthName(m.month)}
                    </th>
                    <td className="py-2.5 text-right">{money(m.income, currency, true)}</td>
                    <td className="py-2.5 text-right text-muted">{money(m.expenses, currency, true)}</td>
                    <td className={cn('py-2.5 text-right', m.net < 0 && 'text-danger')}>{money(m.net, currency, true)}</td>
                    <td className="py-2.5 pr-4 text-right text-muted">{m.savingsRate !== null ? formatPercent(Math.max(0, m.savingsRate)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const r = { from: range.from, to: range.to };
  const expenses = useExpenses(r);
  const income = useIncome(r);
  const balances = useMetrics({ domain: 'financial', ...r });
  const activities = useActivities({ domain: 'financial', ...r });
  const items: HistoryItem[] = [
    ...(expenses.data ?? []).map((e) => ({
      id: e.id,
      at: e.occurredAt,
      title: e.note ?? e.category,
      meta: e.note ? e.category : undefined,
      value: `−${money(e.amount, e.currency)}`,
      icon: Receipt,
      group: 'Expenses',
      remove: (repo: Repository) => repo.expenses.remove(e.id),
      roots: ['expenses' as const],
    })),
    ...(income.data ?? []).map((i) => ({
      id: i.id,
      at: i.receivedAt,
      title: i.note ?? i.source,
      meta: i.note ? i.source : undefined,
      value: `+${money(i.amount, i.currency)}`,
      icon: TrendingUp,
      group: 'Income',
      remove: (repo: Repository) => repo.income.remove(i.id),
      roots: ['income' as const],
    })),
    ...(balances.data ?? []).map((m) => ({
      id: m.id,
      at: m.recordedAt,
      title: m.metric === 'savings_balance' ? 'Savings balance' : m.metric === 'debt_balance' ? 'Debt balance' : m.metric,
      value: money(m.value, m.unit && /^[A-Z]{3}$/.test(m.unit) ? m.unit : currency),
      icon: Landmark,
      group: 'Balances',
      remove: (repo: Repository) => repo.metrics.remove(m.id),
      roots: ['metrics' as const],
    })),
    ...activityItems(activities.data ?? [], currency),
  ];
  return { items, ...combine(expenses, income, balances, activities) };
}

export const financialModule: DomainModule = {
  quickLogs: [
    { id: 'expense', label: 'Expense', icon: Receipt, request: { type: 'expense' } },
    { id: 'income', label: 'Income', icon: Wallet, request: { type: 'income' } },
    { id: 'investment', label: 'Investment', icon: TrendingUp, request: { type: 'investment' } },
    { id: 'balances', label: 'Savings & debt', icon: PiggyBank, request: { type: 'metric', set: 'balances' } },
  ],
  progressTitle: 'Income vs spending',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
