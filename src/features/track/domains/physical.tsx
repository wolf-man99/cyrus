import { useState } from 'react';
import { Dumbbell, FileText, Ruler, Scale, Trash2 } from 'lucide-react';
import { useHealthReports, useMetrics, useMutate, useWeightLogs, useWorkouts, useActivities } from '@/data/hooks/useData';
import { useRepository } from '@/app/providers/DataProvider';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { Row, RowIcon } from '@/components/ui/Row';
import { bucketSum, trend } from '@/domain/series';
import type { HealthReport } from '@/domain/types';
import { dateOf, formatShortDate, timeAgo } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile, signed } from '../components/StatTile';
import { activityItems, type HistoryItem } from '../history';
import { combine, previousRange, type DomainModule, type DomainViewProps } from './types';

const ACCENT = 'var(--color-physical)';
const MEASURE_LABEL: Record<string, string> = { waist: 'Waist', chest: 'Chest', hips: 'Hips', arm: 'Arm', thigh: 'Thigh', body_fat: 'Body fat', neck: 'Neck' };

function Metrics({ range }: DomainViewProps) {
  const prev = previousRange(range);
  const weight = useWeightLogs({ from: range.from, to: range.to });
  const latestWeight = useWeightLogs({ limit: 1 });
  const workouts = useWorkouts({ from: prev.from, to: range.to });
  const measures = useMetrics({ domain: 'physical', metrics: ['waist', 'body_fat'], from: range.from, to: range.to });
  const latestMeasures = useMetrics({ domain: 'physical', metrics: ['waist', 'body_fat'], limit: 20 });

  const w = trend([...(weight.data ?? [])].reverse().map((l) => ({ date: dateOf(l.loggedAt), value: l.value })));
  const now = workouts.data?.filter((x) => dateOf(x.performedAt) >= range.from) ?? [];
  const before = workouts.data?.filter((x) => dateOf(x.performedAt) < range.from) ?? [];
  const latest = (m: string) => latestMeasures.data?.find((x) => x.metric === m);
  const change = (m: string) => trend([...(measures.data ?? [])].filter((x) => x.metric === m).reverse().map((x) => ({ date: dateOf(x.recordedAt), value: x.value })));
  const lw = latestWeight.data?.[0];
  const waist = latest('waist');
  const fat = latest('body_fat');
  const wc = change('waist');
  const fc = change('body_fat');

  return (
    <StatGrid>
      <StatTile
        label="Weight"
        value={lw ? `${formatNumber(lw.value)} ${lw.unit}` : '—'}
        change={w && w.count > 1 ? { text: `${signed(w.change, 1, ` ${lw?.unit ?? ''}`)} in ${range.label}`, tone: 'neutral' } : null}
        hint={lw ? timeAgo(lw.loggedAt) : 'Not logged yet'}
      />
      <StatTile
        label="Workouts"
        value={workouts.data ? now.length : '—'}
        change={
          workouts.data && (now.length || before.length)
            ? { text: `${signed(now.length - before.length, 0)} vs previous`, tone: now.length > before.length ? 'good' : now.length < before.length ? 'bad' : 'neutral' }
            : null
        }
      />
      <StatTile
        label="Waist"
        value={waist ? `${formatNumber(waist.value)} ${waist.unit}` : '—'}
        change={wc && wc.count > 1 ? { text: `${signed(wc.change, 1, ' cm')} in ${range.label}`, tone: wc.change <= 0 ? 'good' : 'bad' } : null}
        hint={waist ? timeAgo(waist.recordedAt) : 'Not measured yet'}
      />
      <StatTile
        label="Body fat"
        value={fat ? `${formatNumber(fat.value)}%` : '—'}
        change={fc && fc.count > 1 ? { text: `${signed(fc.change, 1, ' pts')} in ${range.label}`, tone: fc.change <= 0 ? 'good' : 'bad' } : null}
        hint={fat ? timeAgo(fat.recordedAt) : 'Not measured yet'}
      />
    </StatGrid>
  );
}

function Progress({ range }: DomainViewProps) {
  const weight = useWeightLogs({ from: range.from, to: range.to });
  const workouts = useWorkouts({ from: range.from, to: range.to });
  const points = [...(weight.data ?? [])].reverse().map((l) => ({ date: dateOf(l.loggedAt), value: l.value }));
  const unit = weight.data?.[0]?.unit ?? 'kg';
  const minutes = bucketSum(workouts.data ?? [], (w) => w.performedAt, (w) => w.durationMin, range.bucket, range);

  return (
    <div className="space-y-6">
      {weight.isPending ? (
        <ChartEmpty>Loading…</ChartEmpty>
      ) : points.length >= 2 ? (
        <LineChart series={[{ label: 'Weight', color: ACCENT, points }]} format={(v) => `${formatNumber(v)} ${unit}`} label={`Weight over the ${range.label}`} />
      ) : (
        <ChartEmpty>Log your weight on two different days to see a trend</ChartEmpty>
      )}
      {(workouts.data?.length ?? 0) > 0 && (
        <BarChart series={[{ label: 'Workout minutes', color: 'var(--color-secondary)', points: minutes }]} bucket={range.bucket} format={(v) => `${v} min`} height={90} label="Workout minutes" />
      )}
    </div>
  );
}

function Collections({ range, open }: DomainViewProps) {
  const reports = useHealthReports();
  const workouts = useWorkouts({ from: range.from, to: range.to });
  const exercises = new Map<string, { sessions: number; best: number | null; last: string }>();
  for (const w of workouts.data ?? []) {
    for (const e of w.exercises) {
      const prev = exercises.get(e.name);
      exercises.set(e.name, {
        sessions: (prev?.sessions ?? 0) + 1,
        best: e.weight !== undefined ? Math.max(prev?.best ?? 0, e.weight) : (prev?.best ?? null),
        last: prev && prev.last > w.performedAt ? prev.last : w.performedAt,
      });
    }
  }
  const exerciseList = [...exercises.entries()].sort((a, b) => b[1].sessions - a[1].sessions);

  return (
    <div className="space-y-9">
      {exerciseList.length > 0 && (
        <section aria-labelledby="exercises-heading">
          <h2 id="exercises-heading" className="px-1 text-subhead font-medium text-muted">
            Exercises · {range.label}
          </h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-row border border-line bg-surface/75">
            {exerciseList.map(([name, e]) => (
              <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-subhead">
                <span className="font-medium">{name}</span>
                <span className="text-muted tabular">
                  {e.sessions} sessions{e.best ? ` · best ${formatNumber(e.best)} kg` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Collection<HealthReport>
        id="reports-heading"
        title="Health reports"
        addLabel="Upload"
        onAdd={() => open({ type: 'report' })}
        query={reports}
        empty={{ title: 'No reports yet', description: 'Upload blood work, scans or check-ups. Only you can see them.' }}
        render={(items) => (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id}>
                <ReportRow report={r} />
              </li>
            ))}
          </ul>
        )}
      />
    </div>
  );
}

function ReportRow({ report }: { report: HealthReport }) {
  const repo = useRepository();
  const feedback = useSaveFeedback();
  const [confirm, setConfirm] = useState(false);
  const remove = useMutate((r, rep: HealthReport) => r.healthReports.remove(rep), ['health-reports']);
  const view = async () => {
    // Open the tab synchronously (popup blockers), then point it at the signed URL.
    const tab = window.open('', '_blank');
    try {
      const url = await repo.healthReports.fileUrl(report);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      feedback.failed(err, 'Couldn’t open the report');
    }
  };
  return (
    <Row
      leading={<RowIcon>{<FileText className="size-4.5" />}</RowIcon>}
      title={report.title}
      subtitle={[report.reportDate && formatShortDate(report.reportDate), report.fileName].filter(Boolean).join(' · ')}
      trailing={
        <span className="flex items-center gap-1">
          <button type="button" onClick={view} className="rounded-full px-3 py-1.5 text-subhead font-medium text-secondary hover:bg-white/[0.06]">
            Open
          </button>
          {confirm ? (
            <button
              type="button"
              onClick={() => remove.mutate(report, { onSuccess: () => feedback.saved('Report deleted'), onError: (e) => feedback.failed(e) })}
              className="rounded-full bg-danger/15 px-3 py-1.5 text-subhead font-medium text-danger"
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </button>
          ) : (
            <button type="button" aria-label={`Delete ${report.title}`} onClick={() => setConfirm(true)} className="inline-flex size-9 items-center justify-center rounded-full text-subtle hover:bg-white/[0.06] hover:text-fg">
              <Trash2 className="size-4" />
            </button>
          )}
        </span>
      }
    />
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const r = { from: range.from, to: range.to };
  const weight = useWeightLogs(r);
  const workouts = useWorkouts(r);
  const measures = useMetrics({ domain: 'physical', ...r });
  const activities = useActivities({ domain: 'physical', ...r });
  const items: HistoryItem[] = [
    ...(weight.data ?? []).map((w) => ({
      id: w.id,
      at: w.loggedAt,
      title: 'Weight',
      value: `${formatNumber(w.value)} ${w.unit}`,
      icon: Scale,
      group: 'Weight',
      remove: (repo: Parameters<NonNullable<HistoryItem['remove']>>[0]) => repo.weight.remove(w.id),
      roots: ['weight' as const],
    })),
    ...(workouts.data ?? []).map((w) => ({
      id: w.id,
      at: w.performedAt,
      title: w.workoutType,
      meta: [w.intensity, w.exercises.map((e) => e.name).join(', ')].filter(Boolean).join(' · '),
      value: `${w.durationMin} min`,
      icon: Dumbbell,
      group: 'Workouts',
      remove: (repo: Parameters<NonNullable<HistoryItem['remove']>>[0]) => repo.workouts.remove(w.id),
      roots: ['workouts' as const],
    })),
    ...(measures.data ?? []).map((m) => ({
      id: m.id,
      at: m.recordedAt,
      title: MEASURE_LABEL[m.metric] ?? m.metric,
      value: `${formatNumber(m.value)}${m.unit === '%' ? '%' : ` ${m.unit ?? ''}`}`,
      icon: Ruler,
      group: 'Measurements',
      remove: (repo: Parameters<NonNullable<HistoryItem['remove']>>[0]) => repo.metrics.remove(m.id),
      roots: ['metrics' as const],
    })),
    ...activityItems(activities.data ?? [], currency),
  ];
  return { items, ...combine(weight, workouts, measures, activities) };
}

export const physicalModule: DomainModule = {
  quickLogs: [
    { id: 'weight', label: 'Weight', icon: Scale, request: { type: 'weight' } },
    { id: 'workout', label: 'Workout', icon: Dumbbell, request: { type: 'workout' } },
    { id: 'measure', label: 'Measurements', icon: Ruler, request: { type: 'metric', set: 'body' } },
    { id: 'report', label: 'Health report', icon: FileText, request: { type: 'report' } },
  ],
  progressTitle: 'Weight & training',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
