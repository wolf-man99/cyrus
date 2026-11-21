import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays, CalendarRange, Check, ChevronRight, Moon, NotebookPen, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { useReflections } from '@/data/hooks/useData';
import { usePeriodSummary } from '@/data/hooks/usePeriodSummary';
import { useProfile } from '@/data/hooks/useProfile';
import { REFLECTION_TEMPLATES } from '@/domain/reflections';
import type { Reflection, ReflectionPeriod } from '@/domain/types';
import { addMonths, formatPeriod, periodStart, startOfMonth, today } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { DomainActivity, SummaryStats } from './components/SummaryStats';
import { ReflectionSheet } from './components/ReflectionSheet';

const ICONS: Record<ReflectionPeriod, LucideIcon> = { daily: Moon, weekly: CalendarDays, monthly: CalendarRange };
const PERIODS: ReflectionPeriod[] = ['daily', 'weekly', 'monthly'];

/** The period each card points at. Early in a month, the monthly review is for the month just ended. */
function currentStart(period: ReflectionPeriod): string {
  const now = today();
  if (period === 'monthly' && Number(now.slice(8)) <= 5) return addMonths(startOfMonth(now), -1);
  return periodStart(period, now);
}

/** REFLECT — daily, weekly and monthly reviews connected to what you actually did. */
export function ReflectPage() {
  const all = useReflections();
  const [summaryPeriod, setSummaryPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [filter, setFilter] = useState<ReflectionPeriod | 'all'>('all');
  const [open, setOpen] = useState<Reflection | null>(null);
  const currency = useProfile().data?.currency ?? 'USD';
  const summaryStart = periodStart(summaryPeriod, today());
  const summary = usePeriodSummary(summaryPeriod, summaryStart);

  const history = all.data?.filter((r) => filter === 'all' || r.period === filter);

  return (
    <>
      <PageHeader title="Reflect" description="Short reviews of how your days, weeks and months are going" />

      <section aria-label="Reviews" className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
        {PERIODS.map((p) => {
          const start = currentStart(p);
          const done = all.data?.some((r) => r.period === p && r.periodStart === start);
          const Icon = ICONS[p];
          const t = REFLECTION_TEMPLATES[p];
          return (
            <Link
              key={p}
              to={`/reflect/${p}/${start}`}
              className="group flex items-center gap-4 rounded-card border border-line bg-surface/75 p-4 transition-colors hover:border-white/15 hover:bg-surface md:flex-col md:items-start"
            >
              <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', done ? 'bg-success/15 text-success' : 'bg-primary/15 text-secondary')}>
                {done ? <Check className="size-5" /> : <Icon className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-headline font-semibold">{t.title}</span>
                <span className="block truncate text-footnote text-muted">
                  {formatPeriod(p, start)} · {done ? 'Done, tap to edit' : t.duration}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-subtle md:hidden" />
            </Link>
          );
        })}
      </section>

      <section aria-labelledby="summary-heading" className="mt-10 rounded-card border border-line bg-surface/75 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="summary-heading" className="text-headline font-semibold">
            {summaryPeriod === 'weekly' ? 'This week so far' : 'This month so far'}
          </h2>
          <SegmentedControl
            label="Summary period"
            size="sm"
            className="w-48"
            value={summaryPeriod}
            onChange={setSummaryPeriod}
            options={[
              { value: 'weekly', label: 'Week' },
              { value: 'monthly', label: 'Month' },
            ]}
          />
        </div>
        <div className="mt-5">
          {summary.error ? (
            <ErrorState error={summary.error} onRetry={summary.refetch} />
          ) : !summary.summary ? (
            <SkeletonRows rows={2} />
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <SummaryStats summary={summary.summary} currency={currency} />
              <div>
                <p className="mb-3 text-footnote font-medium text-muted">Entries by area</p>
                <DomainActivity summary={summary.summary} />
              </div>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="past-heading" className="mt-10">
        <SectionHeader id="past-heading" title="Past reflections" meta={history ? `${history.length}` : undefined} />
        <SegmentedControl
          label="Reflection period"
          size="sm"
          className="mt-2 max-w-sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
        <div className="mt-4">
          {all.isPending ? (
            <SkeletonRows rows={3} />
          ) : all.isError ? (
            <ErrorState error={all.error} onRetry={() => void all.refetch()} />
          ) : !history?.length ? (
            <EmptyState icon={<NotebookPen className="size-5" />} title="No reflections yet" description="Your saved reviews are kept here, newest first" />
          ) : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {history.map((r) => {
                const first = Object.values(r.responses).find((v) => v.trim());
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(r)}
                      className="w-full rounded-row border border-line bg-surface/75 px-4 py-3 text-left transition-colors hover:border-white/15 hover:bg-surface"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-callout font-semibold">{formatPeriod(r.period, r.periodStart)}</span>
                        <span className="shrink-0 text-footnote text-muted capitalize">{r.period}</span>
                      </span>
                      {first && <span className="mt-1 line-clamp-2 text-subhead text-muted">{first}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <ReflectionSheet reflection={open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
