import { CircleDollarSign, FlaskConical, Flag, Lightbulb, Rocket } from 'lucide-react';
import { useActivities, useProjects } from '@/data/hooks/useData';
import { LineChart } from '@/components/charts/LineChart';
import { dateOf, today } from '@/lib/dates';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile, signed } from '../components/StatTile';
import { activityItems } from '../history';
import { ProjectList, byRecency } from './projectsList';
import { combine, money, type DomainModule, type DomainViewProps } from './types';

function Metrics({ range, currency }: DomainViewProps) {
  const revenue = useActivities({ domain: 'entrepreneurship', kinds: ['revenue'], limit: 50 });
  const projects = useProjects('entrepreneurship');
  const latest = revenue.data?.[0];
  const atStart = revenue.data?.find((r) => dateOf(r.occurredAt) < range.from);
  const p = projects.data ?? [];
  return (
    <StatGrid>
      <StatTile
        label="Monthly revenue"
        value={latest?.value !== undefined && latest.value !== null ? money(latest.value, currency) : '—'}
        change={latest?.value != null && atStart?.value != null ? { text: `${signed(latest.value - atStart.value, 0)} in ${range.label}`, tone: latest.value >= atStart.value ? 'good' : 'bad' } : null}
        hint={latest ? undefined : 'Log a revenue milestone'}
      />
      <StatTile label="Active ventures" value={projects.data ? p.filter((x) => x.kind === 'venture' && x.status === 'active').length : '—'} hint="Businesses you’re running" />
      <StatTile label="Experiments running" value={projects.data ? p.filter((x) => x.kind === 'experiment' && x.status === 'active').length : '—'} hint={`${p.filter((x) => x.kind === 'experiment' && x.status === 'completed').length} concluded`} />
      <StatTile label="Ideas" value={projects.data ? p.filter((x) => x.kind === 'idea' && x.status === 'idea').length : '—'} hint="Waiting to be tested" />
    </StatGrid>
  );
}

function Progress({ range, currency }: DomainViewProps) {
  const revenue = useActivities({ domain: 'entrepreneurship', kinds: ['revenue'], limit: 200 });
  if (revenue.isPending) return <ChartEmpty>Loading…</ChartEmpty>;
  const all = [...(revenue.data ?? [])].reverse().filter((r) => r.value !== null);
  // Carry the last value from before the range so the line starts at the left edge.
  const before = all.filter((r) => dateOf(r.occurredAt) < range.from).at(-1);
  const inside = all.filter((r) => dateOf(r.occurredAt) >= range.from);
  const points = [
    ...(before ? [{ date: range.from, value: before.value! }] : []),
    ...inside.map((r) => ({ date: dateOf(r.occurredAt), value: r.value! })),
  ];
  if (points.length) points.push({ date: today(), value: points.at(-1)!.value });
  if (points.length < 2) return <ChartEmpty>Log revenue milestones to chart your monthly revenue</ChartEmpty>;
  return <LineChart series={[{ label: 'Monthly revenue', color: 'var(--color-volt)', points }]} format={(v) => money(v, currency)} label={`Monthly revenue over the ${range.label}`} />;
}

function Collections({ open }: DomainViewProps) {
  const projects = useProjects('entrepreneurship');
  const section = (kind: 'venture' | 'experiment' | 'idea', title: string, empty: { title: string; description: string }) => (
    <Collection
      id={`ent-${kind}`}
      title={title}
      onAdd={() => open({ type: 'project', domain: 'entrepreneurship', kind })}
      query={projects}
      filter={(p) => p.kind === kind}
      empty={empty}
      render={(items) => <ProjectList items={[...items].sort(byRecency)} onOpen={(p) => open({ type: 'project', domain: 'entrepreneurship', kind: p.kind, project: p })} />}
    />
  );
  return (
    <div className="space-y-9">
      {section('venture', 'Ventures', { title: 'No active ventures', description: 'Pursue an idea to turn it into a venture' })}
      {section('experiment', 'Experiments', { title: 'No experiments', description: 'Write a hypothesis, run it, record what happened' })}
      {section('idea', 'Ideas', { title: 'No ideas saved', description: 'Park ideas here so they don’t take up headspace' })}
    </div>
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const activities = useActivities({ domain: 'entrepreneurship', from: range.from, to: range.to });
  return { items: activityItems(activities.data ?? [], currency), ...combine(activities) };
}

export const entrepreneurshipModule: DomainModule = {
  quickLogs: [
    { id: 'revenue', label: 'Revenue', icon: CircleDollarSign, request: { type: 'activity', kind: 'revenue' } },
    { id: 'idea', label: 'Idea', icon: Lightbulb, request: { type: 'project', domain: 'entrepreneurship', kind: 'idea' } },
    { id: 'experiment', label: 'Experiment', icon: FlaskConical, request: { type: 'project', domain: 'entrepreneurship', kind: 'experiment' } },
    { id: 'venture', label: 'Venture', icon: Rocket, request: { type: 'project', domain: 'entrepreneurship', kind: 'venture' } },
    { id: 'milestone', label: 'Milestone', icon: Flag, request: { type: 'activity', kind: 'milestone' } },
  ],
  progressTitle: 'Revenue',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
