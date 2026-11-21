import { Brain, HeartPulse, PenLine, Timer } from 'lucide-react';
import { useActivities, useMetrics } from '@/data/hooks/useData';
import type { Repository } from '@/data/repository';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { bucketSum, dailyAverage } from '@/domain/series';
import { dateOf, relativeDayLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile, signed } from '../components/StatTile';
import { activityItems, type HistoryItem } from '../history';
import { MOOD_LABELS, ENERGY_LABELS } from '../sheets/MoodSheet';
import { combine, previousRange, type DomainModule, type DomainViewProps } from './types';

const avg = (vs: number[]) => (vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null);
const sum = (vs: number[]) => vs.reduce((a, b) => a + b, 0);

function Metrics({ range }: DomainViewProps) {
  const prev = previousRange(range);
  const metrics = useMetrics({ domain: 'mental', metrics: ['mood', 'energy'], from: prev.from, to: range.to });
  const acts = useActivities({ domain: 'mental', kinds: ['meditation', 'focus'], from: range.from, to: range.to });
  const inRange = (m: { recordedAt: string }) => dateOf(m.recordedAt) >= range.from;
  const values = (name: string, current: boolean) =>
    (metrics.data ?? []).filter((m) => m.metric === name && inRange(m) === current).map((m) => m.value);
  const mood = avg(values('mood', true));
  const moodPrev = avg(values('mood', false));
  const energy = avg(values('energy', true));
  const energyPrev = avg(values('energy', false));
  const minutes = (kind: string) => sum((acts.data ?? []).filter((a) => a.kind === kind).map((a) => a.value ?? 0));
  const vs = (a: number | null, b: number | null) => (a !== null && b !== null ? { text: `${signed(a - b, 1)} vs previous`, tone: a >= b ? ('good' as const) : ('bad' as const) } : null);

  return (
    <StatGrid>
      <StatTile label="Average mood" value={mood !== null ? `${formatNumber(mood)}/5` : '—'} change={vs(mood, moodPrev)} hint="No check-ins yet" />
      <StatTile label="Average energy" value={energy !== null ? `${formatNumber(energy)}/5` : '—'} change={vs(energy, energyPrev)} hint="No check-ins yet" />
      <StatTile label="Meditation" value={acts.data ? `${minutes('meditation')} min` : '—'} hint={`${(acts.data ?? []).filter((a) => a.kind === 'meditation').length} sessions`} />
      <StatTile label="Focus" value={acts.data ? `${formatNumber(minutes('focus') / 60)} h` : '—'} hint={`${(acts.data ?? []).filter((a) => a.kind === 'focus').length} sessions`} />
    </StatGrid>
  );
}

function Progress({ range }: DomainViewProps) {
  const metrics = useMetrics({ domain: 'mental', metrics: ['mood', 'energy'], from: range.from, to: range.to });
  const meditation = useActivities({ domain: 'mental', kinds: ['meditation'], from: range.from, to: range.to });
  const series = (name: string) =>
    dailyAverage((metrics.data ?? []).filter((m) => m.metric === name), (m) => m.recordedAt, (m) => m.value);
  const mood = series('mood');
  const energy = series('energy');
  const minutes = bucketSum(meditation.data ?? [], (a) => a.occurredAt, (a) => a.value ?? 0, range.bucket, range);

  return (
    <div className="space-y-6">
      {metrics.isPending ? (
        <ChartEmpty>Loading…</ChartEmpty>
      ) : mood.length >= 2 ? (
        <LineChart
          series={[
            { label: 'Mood', color: 'var(--color-volt)', points: mood },
            { label: 'Energy', color: 'var(--color-mental)', points: energy },
          ]}
          domain={[0.6, 5.4]}
          format={(v) => formatNumber(v)}
          label={`Mood and energy over the ${range.label}`}
        />
      ) : (
        <ChartEmpty>Check in on two different days to see how your mood moves</ChartEmpty>
      )}
      {(meditation.data?.length ?? 0) > 0 && (
        <BarChart series={[{ label: 'Meditation', color: 'var(--color-secondary)', points: minutes }]} bucket={range.bucket} format={(v) => `${v} min`} height={90} label="Meditation minutes" />
      )}
    </div>
  );
}

function Collections({ range, open }: DomainViewProps) {
  const journal = useActivities({ domain: 'mental', kinds: ['journal'], from: range.from, to: range.to, limit: 5 });
  return (
    <Collection
      id="journal-heading"
      title="Journal"
      addLabel="Write"
      onAdd={() => open({ type: 'activity', kind: 'journal' })}
      query={journal}
      empty={{ title: 'No entries in this period', description: 'A few lines a day is enough' }}
      render={(items) => (
        <ul className="space-y-2">
          {items.map((j) => (
            <li key={j.id} className="rounded-row border border-line bg-surface/75 px-4 py-3">
              <p className="text-footnote text-subtle">{relativeDayLabel(dateOf(j.occurredAt))}</p>
              <p className="mt-1 text-callout leading-relaxed">{j.notes}</p>
            </li>
          ))}
        </ul>
      )}
    />
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const r = { from: range.from, to: range.to };
  const metrics = useMetrics({ domain: 'mental', ...r });
  const activities = useActivities({ domain: 'mental', ...r });
  // Mood and energy are saved together; show each check-in once.
  const checkIns = new Map<string, { mood?: { id: string; value: number }; energy?: { id: string; value: number }; note: string | null }>();
  for (const m of metrics.data ?? []) {
    const entry = checkIns.get(m.recordedAt) ?? { note: null };
    if (m.metric === 'mood' || m.metric === 'energy') entry[m.metric] = { id: m.id, value: m.value };
    entry.note ??= m.note;
    checkIns.set(m.recordedAt, entry);
  }
  const items: HistoryItem[] = [
    ...[...checkIns.entries()].map(([at, c]) => ({
      id: `${c.mood?.id ?? ''}${c.energy?.id ?? ''}`,
      at,
      title: 'Check-in',
      meta: [
        c.mood && `Mood ${MOOD_LABELS[c.mood.value - 1]?.toLowerCase()}`,
        c.energy && `energy ${ENERGY_LABELS[c.energy.value - 1]?.toLowerCase()}`,
        c.note,
      ]
        .filter(Boolean)
        .join(' · '),
      value: [c.mood?.value, c.energy?.value].filter((v) => v !== undefined).join(' / '),
      icon: HeartPulse,
      group: 'Check-ins',
      remove: async (repo: Repository) => {
        if (c.mood) await repo.metrics.remove(c.mood.id);
        if (c.energy) await repo.metrics.remove(c.energy.id);
      },
      roots: ['metrics' as const],
    })),
    ...activityItems(activities.data ?? [], currency),
  ];
  return { items, ...combine(metrics, activities) };
}

export const mentalModule: DomainModule = {
  quickLogs: [
    { id: 'checkin', label: 'Check in', icon: HeartPulse, request: { type: 'mood' } },
    { id: 'meditation', label: 'Meditation', icon: Brain, request: { type: 'activity', kind: 'meditation' } },
    { id: 'journal', label: 'Journal', icon: PenLine, request: { type: 'activity', kind: 'journal' } },
    { id: 'focus', label: 'Focus session', icon: Timer, request: { type: 'activity', kind: 'focus' } },
  ],
  progressTitle: 'Mood & energy',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
