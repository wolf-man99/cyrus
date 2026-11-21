import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState, SkeletonRows } from '@/components/ui/States';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import { summarizePeriod } from '@/domain/summary';
import { useActivities, useExpenses, useGoals, useWeightLogs, useWorkouts } from '@/data/hooks/useData';
import { useTasksBetween } from '@/data/hooks/useData';
import { addDays, today } from '@/lib/dates';
import { pluralize } from '@/lib/format';
import { cn } from '@/lib/cn';

/** TRACK — the seven life domains, with where you've been active this week. */
export function TrackPage() {
  const to = today();
  const from = addDays(to, -6);
  const goals = useGoals();
  const activities = useActivities({ from, to });
  const workouts = useWorkouts({ from, to });
  const weight = useWeightLogs({ from, to });
  const expenses = useExpenses({ from, to });
  const tasks = useTasksBetween(from, to);
  const loading = goals.isPending || activities.isPending || workouts.isPending || tasks.isPending;
  const summary = loading
    ? null
    : summarizePeriod(
        {
          tasks: tasks.data ?? [],
          habits: [],
          habitLogs: [],
          workouts: workouts.data ?? [],
          weight: weight.data ?? [],
          expenses: expenses.data ?? [],
          income: [],
          activities: activities.data ?? [],
          metrics: [],
          goals: goals.data ?? [],
        },
        from,
        to,
      );

  return (
    <>
      <PageHeader title="Track" description="Seven areas of your life, each with its goals, activity and history" />
      {summary && summary.neglected.length > 0 && summary.neglected.length < 7 && (
        <p className="mb-4 rounded-row border border-line bg-surface/60 px-4 py-3 text-subhead text-muted">
          Quiet this week: <span className="text-fg">{summary.neglected.map((d) => LIFE_DOMAIN_LIST.find((x) => x.id === d)!.name).join(', ')}</span>
        </p>
      )}
      {goals.isError ? (
        <ErrorState title="Couldn’t load your domains" error={goals.error} onRetry={() => void goals.refetch()} />
      ) : loading ? (
        <SkeletonRows rows={7} />
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
          {LIFE_DOMAIN_LIST.map((d) => {
            const active = goals.data!.filter((g) => g.domain === d.id && g.status === 'active').length;
            const moves = summary?.domains[d.id] ?? 0;
            const Icon = d.icon;
            return (
              <li key={d.id}>
                <Link
                  to={`/track/${d.id}`}
                  className="group flex min-h-19 items-center gap-4 rounded-row border border-line bg-surface/75 px-4 py-3 transition-colors hover:border-white/15 hover:bg-surface"
                >
                  <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-fg">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-headline font-semibold">
                      {d.name}
                      <span aria-hidden className="size-1.5 rounded-full" style={{ background: d.accent }} />
                    </span>
                    <span className="block truncate text-footnote text-muted">
                      {active > 0 ? pluralize(active, 'active goal') : 'No goals yet'}
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-right text-footnote tabular', moves ? 'text-muted' : 'text-subtle')}>
                    <span className={cn('block text-headline font-semibold', moves ? 'text-fg' : 'text-subtle')}>{moves}</span>
                    this week
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
