import { Dumbbell, Scale } from 'lucide-react';
import { useWeightLogs, useWorkouts } from '@/data/hooks/useLogs';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DomainGoals } from './DomainGoals';
import { StatTile } from './StatTile';
import { WeightTrendChart } from './WeightTrendChart';
import { formatNumber } from '@/lib/format';
import { timeAgo } from '@/lib/dates';
import type { DomainModule } from './registry';

const WEEK_MS = 7 * 86_400_000;

function PhysicalOverview() {
  const weight = useWeightLogs();
  const workouts = useWorkouts();
  const latest = weight.data?.[0];
  const recent = workouts.data?.filter((w) => Date.now() - new Date(w.performedAt).getTime() < WEEK_MS) ?? [];
  const minutes = recent.reduce((sum, w) => sum + w.durationMin, 0);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Weight"
          value={latest ? `${formatNumber(latest.value)} ${latest.unit}` : '—'}
          hint={latest ? timeAgo(latest.loggedAt) : 'Log from Today'}
        />
        <StatTile label="Workouts · 7 days" value={workouts.data ? recent.length : '—'} hint={`${minutes} min active`} />
      </div>
      {weight.data && weight.data.length >= 2 && <WeightTrendChart logs={weight.data} />}
      <DomainGoals domain="physical" compact />
    </div>
  );
}

function Workouts() {
  const workouts = useWorkouts();
  return (
    <section aria-labelledby="workouts-h">
      <SectionHeader id="workouts-h" title="Workouts" />
      <div className="mt-2">
        {workouts.isPending ? (
          <SkeletonRows />
        ) : workouts.isError ? (
          <ErrorState error={workouts.error} onRetry={() => void workouts.refetch()} />
        ) : workouts.data.length === 0 ? (
          <EmptyState icon={<Dumbbell className="size-5" />} title="No workouts yet" description="Use Workout on Today to log one" />
        ) : (
          <ul className="space-y-2">
            {workouts.data.map((w) => (
              <li key={w.id} className="flex items-center gap-3.5 rounded-row border border-line bg-surface/75 px-4 py-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/[0.06] text-muted">
                  <Dumbbell className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-callout font-semibold">{w.workoutType}</p>
                  <p className="text-footnote text-muted capitalize">
                    {timeAgo(w.performedAt)}
                    {w.intensity && ` · ${w.intensity}`}
                  </p>
                </div>
                <span className="text-subhead text-muted tabular">{w.durationMin} min</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function WeightProgress() {
  const weight = useWeightLogs(90);
  if (weight.isPending) return <SkeletonRows rows={1} />;
  if (weight.isError) return <ErrorState error={weight.error} onRetry={() => void weight.refetch()} />;
  if (weight.data.length < 2)
    return <EmptyState icon={<Scale className="size-5" />} title="Not enough data yet" description="Log your weight on two different days to see a trend" />;
  return <WeightTrendChart logs={weight.data} />;
}

function PhysicalHistory() {
  const weight = useWeightLogs();
  const workouts = useWorkouts();
  if (weight.isPending || workouts.isPending) return <SkeletonRows />;
  const items = [
    ...(weight.data ?? []).map((w) => ({ id: w.id, at: w.loggedAt, title: `Weight · ${formatNumber(w.value)} ${w.unit}`, icon: Scale })),
    ...(workouts.data ?? []).map((w) => ({ id: w.id, at: w.performedAt, title: `${w.workoutType} · ${w.durationMin} min`, icon: Dumbbell })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (items.length === 0) return <EmptyState title="No history yet" description="Your weight and workout logs show up here" />;
  return (
    <ol className="space-y-2">
      {items.map(({ id, at, title, icon: Icon }) => (
        <li key={id} className="flex items-center gap-3 rounded-row border border-line bg-surface/75 px-4 py-3">
          <Icon className="size-4.5 text-muted" />
          <span className="flex-1 text-callout">{title}</span>
          <span className="text-footnote text-muted">{timeAgo(at)}</span>
        </li>
      ))}
    </ol>
  );
}

export const physicalModule: DomainModule = {
  overview: PhysicalOverview,
  activities: Workouts,
  progress: WeightProgress,
  history: PhysicalHistory,
};
