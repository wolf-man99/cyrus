import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useGoals } from '@/data/hooks/useData';
import { goalProgress } from '@/domain/goals';
import { GOAL_CATEGORIES } from '@/domain/goals';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import type { Goal, LifeDomain } from '@/domain/types';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { formatNumber, formatPercent } from '@/lib/format';
import { formatShortDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

type GoalView = 'active' | 'done' | 'archived';

interface GoalsSectionProps {
  domain: LifeDomain;
  onAdd(): void;
  onOpen(goal: Goal): void;
}

export function GoalsSection({ domain, onAdd, onOpen }: GoalsSectionProps) {
  const [view, setView] = useState<GoalView>('active');
  const goals = useGoals({ domain, includeArchived: true });
  const visible = goals.data?.filter((g) =>
    view === 'active' ? g.status === 'active' || g.status === 'paused' : view === 'done' ? g.status === 'completed' : g.status === 'archived',
  );
  const counts = {
    active: goals.data?.filter((g) => g.status === 'active' || g.status === 'paused').length ?? 0,
    done: goals.data?.filter((g) => g.status === 'completed').length ?? 0,
    archived: goals.data?.filter((g) => g.status === 'archived').length ?? 0,
  };

  return (
    <section aria-labelledby={`goals-${domain}`}>
      <SectionHeader
        id={`goals-${domain}`}
        title="Goals"
        action={
          <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-secondary hover:text-fg">
            <Plus className="size-4" /> Add
          </button>
        }
      />
      {(counts.done > 0 || counts.archived > 0) && (
        <div className="mt-1 flex gap-1.5 px-1" role="tablist" aria-label="Goal status">
          {(['active', 'done', 'archived'] as GoalView[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                'h-8 rounded-full px-3 text-footnote font-medium capitalize transition-colors',
                view === v ? 'bg-white/[0.1] text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {v} <span className="text-subtle tabular">{counts[v]}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-2">
        {goals.isPending ? (
          <SkeletonRows rows={2} />
        ) : goals.isError ? (
          <ErrorState title="Couldn’t load goals" error={goals.error} onRetry={() => void goals.refetch()} />
        ) : visible && visible.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {visible.map((g) => (
              <li key={g.id}>
                <GoalRow goal={g} onOpen={() => onOpen(g)} />
              </li>
            ))}
          </ul>
        ) : view === 'active' ? (
          <EmptyState
            compact
            icon={<Target className="size-5" />}
            title="No active goals"
            description="A goal gives this area a direction to grow in"
            action={
              <Button size="sm" variant="secondary" onClick={onAdd}>
                Set a goal
              </Button>
            }
          />
        ) : (
          <p className="px-1 py-4 text-subhead text-muted">Nothing here yet</p>
        )}
      </div>
    </section>
  );
}

function GoalRow({ goal, onOpen }: { goal: Goal; onOpen(): void }) {
  const ratio = goalProgress(goal);
  const accent = LIFE_DOMAIN_CONFIG[goal.domain].accent;
  const category = GOAL_CATEGORIES[goal.domain]?.find((c) => c.id === goal.category)?.label;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-row border border-line bg-surface/75 px-4 py-3.5 text-left transition-colors hover:border-white/15 hover:bg-surface"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-callout font-semibold">{goal.title}</span>
        {ratio !== null && <span className="shrink-0 text-subhead text-muted tabular">{formatPercent(ratio)}</span>}
      </span>
      <span className="mt-0.5 block truncate text-footnote text-muted tabular">
        {[
          category,
          goal.targetValue !== null
            ? `${formatNumber(goal.currentValue)} → ${formatNumber(goal.targetValue)}${goal.unit ? ` ${goal.unit}` : ''}`
            : goal.status === 'completed'
              ? 'Milestone reached'
              : 'Milestone',
          goal.targetDate && `by ${formatShortDate(goal.targetDate)}`,
          goal.status === 'paused' && 'Paused',
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
      {ratio !== null && (
        <span
          className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          aria-label={`${goal.title} progress`}
        >
          <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, ratio * 100)}%`, background: accent }} />
        </span>
      )}
    </button>
  );
}
