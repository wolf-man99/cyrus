import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState, SkeletonRows } from '@/components/ui/States';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import { useGoals } from '@/data/hooks/useLogs';
import { pluralize } from '@/lib/format';

/** TRACK — the seven life domains. */
export function TrackPage() {
  const goals = useGoals();

  return (
    <>
      <PageHeader title="Track" description="Seven areas of your life, each with its goals, activity and history" />

      {goals.isError ? (
        <ErrorState title="Couldn’t load your domains" error={goals.error} onRetry={() => void goals.refetch()} />
      ) : goals.isPending ? (
        <SkeletonRows rows={7} />
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
          {LIFE_DOMAIN_LIST.map((d) => {
            const active = goals.data.filter((g) => g.domain === d.id && g.status === 'active').length;
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
                    <span className="block truncate text-footnote text-muted">{d.tagline}</span>
                  </span>
                  <span className="shrink-0 text-subhead text-muted tabular">
                    {active > 0 ? pluralize(active, 'goal') : 'No goals'}
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
