import { Award, BriefcaseBusiness, Flag, Sparkle } from 'lucide-react';
import { useActivities, useProjects, useSkills } from '@/data/hooks/useData';
import { BarChart } from '@/components/charts/BarChart';
import { bucketSum } from '@/domain/series';
import { formatNumber } from '@/lib/format';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile } from '../components/StatTile';
import { activityItems } from '../history';
import { SkillsCollection } from './intellectual';
import { ProjectList, byRecency } from './projectsList';
import { combine, type DomainModule, type DomainViewProps } from './types';

function Metrics({ range }: DomainViewProps) {
  const projects = useProjects('career');
  const acts = useActivities({ domain: 'career', kinds: ['achievement', 'milestone'], from: range.from, to: range.to });
  const skills = useSkills('career');
  const gap = (skills.data ?? []).filter((s) => s.targetLevel && s.targetLevel > s.level);
  const avg = skills.data?.length ? skills.data.reduce((s, k) => s + k.level, 0) / skills.data.length : null;
  return (
    <StatGrid>
      <StatTile label="Active projects" value={projects.data ? projects.data.filter((p) => p.status === 'active').length : '—'} hint={`${projects.data?.filter((p) => p.status === 'completed').length ?? 0} completed`} />
      <StatTile label="Achievements" value={acts.data ? acts.data.filter((a) => a.kind === 'achievement').length : '—'} hint="Wins worth remembering" />
      <StatTile label="Milestones" value={acts.data ? acts.data.filter((a) => a.kind === 'milestone').length : '—'} hint="Steps up in your role" />
      <StatTile label="Skill level" value={avg !== null ? `${formatNumber(avg)}/5` : '—'} hint={gap.length ? `${gap.length} skills below target` : 'Average across skills'} />
    </StatGrid>
  );
}

function Progress({ range }: DomainViewProps) {
  const acts = useActivities({ domain: 'career', kinds: ['achievement', 'milestone'], from: range.from, to: range.to });
  if (acts.isPending) return <ChartEmpty>Loading…</ChartEmpty>;
  if (!acts.data?.length) return <ChartEmpty>Log achievements and milestones to see momentum</ChartEmpty>;
  const bucket = range.days <= 31 ? 'week' : 'month';
  const count = (kind: string) => bucketSum(acts.data!.filter((a) => a.kind === kind), (a) => a.occurredAt, () => 1, bucket, range);
  return (
    <BarChart
      series={[
        { label: 'Achievements', color: 'var(--color-career)', points: count('achievement') },
        { label: 'Milestones', color: 'var(--color-secondary)', points: count('milestone') },
      ]}
      bucket={bucket}
      format={(v) => String(v)}
      label={`Career achievements over the ${range.label}`}
    />
  );
}

function Collections({ open }: DomainViewProps) {
  const projects = useProjects('career');
  const skills = useSkills('career');
  return (
    <div className="space-y-9">
      <Collection
        id="career-projects"
        title="Projects"
        onAdd={() => open({ type: 'project', domain: 'career', kind: 'project' })}
        query={projects}
        empty={{ title: 'No projects yet', description: 'Track the work that moves your career' }}
        render={(items) => <ProjectList items={[...items].sort(byRecency)} onOpen={(p) => open({ type: 'project', domain: 'career', kind: p.kind, project: p })} />}
      />
      <SkillsCollection query={skills} title="Professional skills" onAdd={() => open({ type: 'skill', domain: 'career' })} onOpen={(s) => open({ type: 'skill', domain: 'career', skill: s })} />
    </div>
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const activities = useActivities({ domain: 'career', from: range.from, to: range.to });
  return { items: activityItems(activities.data ?? [], currency), ...combine(activities) };
}

export const careerModule: DomainModule = {
  quickLogs: [
    { id: 'achievement', label: 'Achievement', icon: Award, request: { type: 'activity', kind: 'achievement' } },
    { id: 'milestone', label: 'Milestone', icon: Flag, request: { type: 'activity', kind: 'milestone' } },
    { id: 'project', label: 'Project', icon: BriefcaseBusiness, request: { type: 'project', domain: 'career', kind: 'project' } },
    { id: 'skill', label: 'Skill', icon: Sparkle, request: { type: 'skill', domain: 'career' } },
  ],
  progressTitle: 'Career momentum',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
