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
      <PageHeader title="Track" description="Seven domains. One life. See where you’re growing and what needs attention." />

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
                  className="group flex min-h-[4.75rem] items-center gap-4 rounded-row border border-line bg-surface/75 px-4 py-3.5 transition-all duration-300 hover:border-white/15 hover:bg-surface active:scale-[0.99]"
                >
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-full transition-shadow duration-300"
                    style={{
                      background: `color-mix(in oklab, ${d.accent} 15%, transparent)`,
                      color: d.accent,
                      boxShadow: `0 0 28px -10px ${d.accent}`,
                    }}
                  >
                    <Icon className="size-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-headline font-semibold">{d.name}</span>
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
