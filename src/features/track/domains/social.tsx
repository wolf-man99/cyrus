import { Handshake, Mic, Users } from 'lucide-react';
import { useActivities } from '@/data/hooks/useData';
import { BarChart } from '@/components/charts/BarChart';
import { bucketSum } from '@/domain/series';
import { dateOf, diffInDays, relativeDayLabel, today } from '@/lib/dates';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile } from '../components/StatTile';
import { activityItems } from '../history';
import { combine, type DomainModule, type DomainViewProps } from './types';

function Metrics({ range }: DomainViewProps) {
  const acts = useActivities({ domain: 'social', from: range.from, to: range.to });
  const last = useActivities({ domain: 'social', kinds: ['social'], limit: 1 });
  const of = (kind: string) => (acts.data ?? []).filter((a) => a.kind === kind);
  const speaking = of('speaking');
  const minutes = speaking.reduce((s, a) => s + (a.value ?? 0), 0);
  const lastAt = last.data?.[0]?.occurredAt;
  const since = lastAt ? diffInDays(today(), dateOf(lastAt)) : null;
  return (
    <StatGrid>
      <StatTile label="Time with people" value={acts.data ? of('social').length : '—'} hint="Social activities" />
      <StatTile
        label="Since last meetup"
        value={since === null ? '—' : since === 0 ? 'Today' : `${since} days`}
        change={since !== null && since > 10 ? { text: 'Longer than usual', tone: 'bad' } : null}
        hint={since === null ? 'Nothing logged yet' : undefined}
      />
      <StatTile label="Speaking practice" value={acts.data ? speaking.length : '—'} hint={`${minutes} min on your feet`} />
      <StatTile label="Reached out" value={acts.data ? of('outreach').length : '—'} hint="Messages, intros, thank-yous" />
    </StatGrid>
  );
}

function Progress({ range }: DomainViewProps) {
  const acts = useActivities({ domain: 'social', kinds: ['social', 'outreach', 'speaking'], from: range.from, to: range.to });
  if (acts.isPending) return <ChartEmpty>Loading…</ChartEmpty>;
  if (!acts.data?.length) return <ChartEmpty>Log time with people to see your rhythm</ChartEmpty>;
  const count = (kind: string) => bucketSum(acts.data!.filter((a) => a.kind === kind), (a) => a.occurredAt, () => 1, range.bucket, range);
  return (
    <BarChart
      series={[
        { label: 'Social', color: 'var(--color-social)', points: count('social') },
        { label: 'Speaking', color: 'var(--color-secondary)', points: count('speaking') },
      ]}
      bucket={range.bucket}
      format={(v) => String(v)}
      label={`Social activity over the ${range.label}`}
    />
  );
}

function Collections({ range, open }: DomainViewProps) {
  const speaking = useActivities({ domain: 'social', kinds: ['speaking'], from: range.from, to: range.to, limit: 5 });
  return (
    <Collection
      id="speaking-heading"
      title="Public speaking practice"
      addLabel="Log"
      onAdd={() => open({ type: 'activity', kind: 'speaking' })}
      query={speaking}
      empty={{ title: 'No practice in this period', description: 'Even five minutes out loud counts' }}
      render={(items) => (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="rounded-row border border-line bg-surface/75 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-callout font-semibold">{s.title}</p>
                <span className="shrink-0 text-footnote text-muted tabular">
                  {[s.value && `${s.value} min`, typeof s.details.rating === 'number' && `${s.details.rating}/5`].filter(Boolean).join(' · ')}
                </span>
              </div>
              {s.notes && <p className="mt-1 text-subhead text-muted">{s.notes}</p>}
              <p className="mt-1 text-footnote text-subtle">{relativeDayLabel(dateOf(s.occurredAt))}</p>
            </li>
          ))}
        </ul>
      )}
    />
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const activities = useActivities({ domain: 'social', from: range.from, to: range.to });
  return { items: activityItems(activities.data ?? [], currency), ...combine(activities) };
}

export const socialModule: DomainModule = {
  quickLogs: [
    { id: 'social', label: 'Time with people', icon: Users, request: { type: 'activity', kind: 'social' } },
    { id: 'speaking', label: 'Speaking practice', icon: Mic, request: { type: 'activity', kind: 'speaking' } },
    { id: 'outreach', label: 'Reached out', icon: Handshake, request: { type: 'activity', kind: 'outreach' } },
  ],
  progressTitle: 'Social rhythm',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
