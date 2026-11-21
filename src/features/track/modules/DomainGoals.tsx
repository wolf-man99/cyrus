import { Target } from 'lucide-react';
import { useGoals } from '@/data/hooks/useLogs';
import { goalProgress } from '@/domain/goals';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import type { LifeDomain } from '@/domain/types';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { formatNumber, formatPercent } from '@/lib/format';
import { formatShortDate } from '@/lib/dates';

export function DomainGoals({ domain, compact }: { domain: LifeDomain; compact?: boolean }) {
  const goals = useGoals(domain);
  const accent = LIFE_DOMAIN_CONFIG[domain].accent;

  return (
    <section aria-labelledby={`goals-${domain}`}>
      <SectionHeader id={`goals-${domain}`} title="Goals" meta={goals.data?.length ? `${goals.data.length} active` : undefined} />
      <div className="mt-2">
        {goals.isPending ? (
          <SkeletonRows rows={2} />
        ) : goals.isError ? (
          <ErrorState title="Couldn’t load goals" error={goals.error} onRetry={() => void goals.refetch()} />
        ) : goals.data.length === 0 ? (
          <EmptyState
            compact={compact}
            icon={<Target className="size-5" />}
            title="No goals here yet"
            description="Goals give this domain direction. Ask Cyrus to set one once the assistant is connected."
          />
        ) : (
          <ul className="space-y-2">
            {goals.data.map((g) => {
              const ratio = goalProgress(g);
              return (
                <li key={g.id} className="rounded-row border border-line bg-surface/75 px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-callout font-semibold">{g.title}</p>
                    {ratio !== null && <span className="shrink-0 text-subhead text-muted tabular">{formatPercent(ratio)}</span>}
                  </div>
                  <p className="mt-0.5 text-footnote text-muted tabular">
                    {g.targetValue !== null
                      ? `${formatNumber(g.currentValue)} of ${formatNumber(g.targetValue)}${g.unit ? ` ${g.unit}` : ''}`
                      : 'Milestone goal'}
                    {g.targetDate && ` · by ${formatShortDate(g.targetDate)}`}
                  </p>
                  {ratio !== null && (
                    <div
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(ratio * 100)}
                      aria-label={`${g.title} progress`}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${Math.max(2, ratio * 100)}%`, background: accent }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
