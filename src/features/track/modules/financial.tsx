import { Receipt } from 'lucide-react';
import { useTransactions } from '@/data/hooks/useLogs';
import { useProfile } from '@/data/hooks/useProfile';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DomainGoals } from './DomainGoals';
import { StatTile } from './StatTile';
import { formatCurrency } from '@/lib/format';
import { timeAgo, toISODate } from '@/lib/dates';
import type { Transaction } from '@/domain/types';
import type { DomainModule } from './registry';

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};
const spent = (txs: Transaction[]) => txs.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0);

function FinancialOverview() {
  const txs = useTransactions(200);
  const currency = useProfile().data?.currency ?? 'USD';
  const todayISO = toISODate(new Date());
  const today = txs.data?.filter((t) => toISODate(new Date(t.occurredAt)) === todayISO) ?? [];
  const month = txs.data?.filter((t) => t.occurredAt >= startOfMonth()) ?? [];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Spent today" value={txs.data ? formatCurrency(spent(today), currency) : '—'} hint={`${today.length} expenses`} />
        <StatTile label="This month" value={txs.data ? formatCurrency(spent(month), currency) : '—'} hint={`${month.length} expenses`} />
      </div>
      {txs.data && month.length > 0 && <SpendingByCategory txs={month} currency={currency} />}
      <DomainGoals domain="financial" compact />
    </div>
  );
}

/** Single-measure bar list: one hue, magnitude by length, labels in text tokens. */
function SpendingByCategory({ txs, currency }: { txs: Transaction[]; currency: string }) {
  const totals = new Map<string, number>();
  for (const t of txs) if (t.kind === 'expense') totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  return (
    <figure className="rounded-card border border-line bg-surface/75 p-4">
      <figcaption className="text-subhead font-medium text-muted">Spending by category · this month</figcaption>
      <table className="mt-3 w-full text-left">
        <caption className="sr-only">Spending by category this month</caption>
        <tbody>
          {rows.map(([category, total]) => (
            <tr key={category}>
              <th scope="row" className="w-24 py-1.5 pr-3 text-subhead font-normal text-fg">
                {category}
              </th>
              <td className="py-1.5">
                <div className="h-2 rounded-full bg-financial" style={{ width: `${Math.max(3, (total / max) * 100)}%` }} />
              </td>
              <td className="w-24 py-1.5 pl-3 text-right text-subhead text-muted tabular">{formatCurrency(total, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Expenses() {
  const txs = useTransactions();
  return (
    <section aria-labelledby="expenses-h">
      <SectionHeader id="expenses-h" title="Expenses" />
      <div className="mt-2">
        {txs.isPending ? (
          <SkeletonRows />
        ) : txs.isError ? (
          <ErrorState error={txs.error} onRetry={() => void txs.refetch()} />
        ) : txs.data.length === 0 ? (
          <EmptyState icon={<Receipt className="size-5" />} title="No expenses yet" description="Use Expense on Today to log one." />
        ) : (
          <ul className="space-y-2">
            {txs.data.map((t) => (
              <li key={t.id} className="flex items-center gap-3.5 rounded-row border border-line bg-surface/75 px-4 py-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-financial)_16%,transparent)] text-financial">
                  <Receipt className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-callout font-semibold">{t.note ?? t.category}</p>
                  <p className="text-footnote text-muted">
                    {t.category} · {timeAgo(t.occurredAt)}
                  </p>
                </div>
                <span className="text-subhead tabular">{formatCurrency(t.amount, t.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FinancialProgress() {
  const txs = useTransactions(200);
  const currency = useProfile().data?.currency ?? 'USD';
  if (txs.isPending) return <SkeletonRows rows={2} />;
  if (txs.isError) return <ErrorState error={txs.error} onRetry={() => void txs.refetch()} />;
  const month = txs.data.filter((t) => t.occurredAt >= startOfMonth());
  if (month.length === 0) return <EmptyState title="No spending this month" description="Expenses you log will be summarised here." />;
  return <SpendingByCategory txs={month} currency={currency} />;
}

export const financialModule: DomainModule = {
  overview: FinancialOverview,
  activities: Expenses,
  progress: FinancialProgress,
  history: Expenses,
};
