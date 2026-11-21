import { BookOpen, BookPlus, GraduationCap, NotebookPen, Sparkle } from 'lucide-react';
import { useActivities, useLearning, useSkills } from '@/data/hooks/useData';
import { BarChart } from '@/components/charts/BarChart';
import { bucketSum } from '@/domain/series';
import type { LearningResource, Skill } from '@/domain/types';
import { dateOf, relativeDayLabel, today } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Collection } from '../components/Collection';
import { ChartEmpty } from '../components/ChartCard';
import { StatGrid, StatTile } from '../components/StatTile';
import { activityItems } from '../history';
import { LEVEL_LABELS } from '../sheets/EntitySheets';
import { combine, type DomainModule, type DomainViewProps } from './types';

const sum = (vs: number[]) => vs.reduce((a, b) => a + b, 0);

function Metrics({ range }: DomainViewProps) {
  const acts = useActivities({ domain: 'intellectual', kinds: ['reading', 'course', 'note'], from: range.from, to: range.to });
  const learning = useLearning();
  const year = today().slice(0, 4);
  const finished = learning.data?.filter((r) => r.kind === 'book' && r.status === 'completed' && r.completedAt?.startsWith(year)).length;
  const of = (kind: string) => (acts.data ?? []).filter((a) => a.kind === kind);
  return (
    <StatGrid>
      <StatTile label="Pages read" value={acts.data ? formatNumber(sum(of('reading').map((a) => a.value ?? 0))) : '—'} hint={`${of('reading').length} sessions`} />
      <StatTile label="Lessons" value={acts.data ? formatNumber(sum(of('course').map((a) => a.value ?? 0))) : '—'} hint={`${learning.data?.filter((r) => r.kind === 'course' && r.status === 'active').length ?? 0} active courses`} />
      <StatTile label={`Books finished in ${year}`} value={finished ?? '—'} hint={`${learning.data?.filter((r) => r.kind === 'book' && r.status === 'active').length ?? 0} in progress`} />
      <StatTile label="Notes" value={acts.data ? of('note').length : '—'} hint="Ideas worth keeping" />
    </StatGrid>
  );
}

function Progress({ range }: DomainViewProps) {
  const reading = useActivities({ domain: 'intellectual', kinds: ['reading'], from: range.from, to: range.to });
  const pages = bucketSum(reading.data ?? [], (a) => a.occurredAt, (a) => a.value ?? 0, range.bucket, range);
  if (reading.isPending) return <ChartEmpty>Loading…</ChartEmpty>;
  if (!reading.data?.length) return <ChartEmpty>Log reading sessions to see your pace</ChartEmpty>;
  return <BarChart series={[{ label: 'Pages read', color: 'var(--color-intellectual)', points: pages }]} bucket={range.bucket} format={(v) => `${formatNumber(v)} pages`} label={`Pages read over the ${range.label}`} />;
}

const STATUS_ORDER: Record<LearningResource['status'], number> = { active: 0, planned: 1, paused: 2, completed: 3 };

function Collections({ range, open }: DomainViewProps) {
  const learning = useLearning();
  const skills = useSkills('intellectual');
  const notes = useActivities({ domain: 'intellectual', kinds: ['note'], from: range.from, to: range.to, limit: 4 });
  return (
    <div className="space-y-9">
      <Collection<LearningResource>
        id="learning-heading"
        title="Books & courses"
        onAdd={() => open({ type: 'resource' })}
        query={learning}
        empty={{ title: 'Nothing on your list', description: 'Add a book or course you’re working through' }}
        render={(items) => (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {[...items]
              .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
              .slice(0, 8)
              .map((r) => (
                <li key={r.id}>
                  <ResourceRow resource={r} onOpen={() => open({ type: 'resource', resource: r })} />
                </li>
              ))}
          </ul>
        )}
      />
      <SkillsCollection query={skills} onAdd={() => open({ type: 'skill', domain: 'intellectual' })} onOpen={(s) => open({ type: 'skill', domain: 'intellectual', skill: s })} title="Skills you’re developing" />
      <Collection
        id="notes-heading"
        title="Knowledge notes"
        onAdd={() => open({ type: 'activity', kind: 'note' })}
        query={notes}
        empty={{ title: 'No notes in this period', description: 'Capture one idea from what you read or learn' }}
        render={(items) => (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((n) => (
              <li key={n.id} className="rounded-row border border-line bg-surface/75 px-4 py-3">
                <p className="text-callout font-semibold">{n.title}</p>
                <p className="mt-1 text-subhead leading-relaxed text-muted">{n.notes}</p>
                <p className="mt-2 text-footnote text-subtle">{relativeDayLabel(dateOf(n.occurredAt))}</p>
              </li>
            ))}
          </ul>
        )}
      />
    </div>
  );
}

function ResourceRow({ resource: r, onOpen }: { resource: LearningResource; onOpen(): void }) {
  const ratio = r.total ? r.progress / r.total : null;
  const Icon = r.kind === 'course' ? GraduationCap : BookOpen;
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-start gap-3.5 rounded-row border border-line bg-surface/75 px-4 py-3 text-left transition-colors hover:border-white/15 hover:bg-surface">
      <Icon className="mt-0.5 size-4.5 shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-callout font-semibold">{r.title}</span>
        <span className="block truncate text-footnote text-muted">
          {[r.author, r.status === 'active' ? null : r.status === 'completed' ? `Finished${r.rating ? ` · ${r.rating}★` : ''}` : r.status[0]!.toUpperCase() + r.status.slice(1)]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {r.status !== 'completed' && ratio !== null && (
          <span className="mt-2 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <span className="block h-full rounded-full bg-intellectual" style={{ width: `${Math.max(2, ratio * 100)}%` }} />
            </span>
            <span className="text-footnote text-muted tabular">
              {formatNumber(r.progress)}/{formatNumber(r.total!)} {r.unit}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}

export function SkillsCollection({
  query,
  onAdd,
  onOpen,
  title,
}: {
  query: ReturnType<typeof useSkills>;
  onAdd(): void;
  onOpen(skill: Skill): void;
  title: string;
}) {
  return (
    <Collection<Skill>
      id={`skills-${title}`}
      title={title}
      onAdd={onAdd}
      query={query}
      empty={{ title: 'No skills yet', description: 'Track a few skills with a current and target level' }}
      render={(items) => (
        <ul className="divide-y divide-line overflow-hidden rounded-row border border-line bg-surface/75">
          {items.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-callout font-medium">{s.name}</span>
                  <span className="block text-footnote text-muted">
                    {LEVEL_LABELS[s.level - 1]}
                    {s.targetLevel && s.targetLevel > s.level ? ` · aiming for ${LEVEL_LABELS[s.targetLevel - 1]!.toLowerCase()}` : ''}
                  </span>
                </span>
                <span className="flex gap-1" aria-label={`Level ${s.level} of 5${s.targetLevel ? `, target ${s.targetLevel}` : ''}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={cn(
                        'h-2 w-4 rounded-full',
                        n <= s.level ? 'bg-secondary' : s.targetLevel && n <= s.targetLevel ? 'border border-secondary/60' : 'bg-white/[0.08]',
                      )}
                    />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    />
  );
}

function useHistory(range: DomainViewProps['range'], currency: string) {
  const activities = useActivities({ domain: 'intellectual', from: range.from, to: range.to });
  return { items: activityItems(activities.data ?? [], currency), ...combine(activities) };
}

export const intellectualModule: DomainModule = {
  quickLogs: [
    { id: 'progress', label: 'Log reading', icon: BookOpen, request: { type: 'progress' } },
    { id: 'resource', label: 'Add book or course', icon: BookPlus, request: { type: 'resource' } },
    { id: 'note', label: 'Note', icon: NotebookPen, request: { type: 'activity', kind: 'note' } },
    { id: 'skill', label: 'Skill', icon: Sparkle, request: { type: 'skill', domain: 'intellectual' } },
  ],
  progressTitle: 'Reading pace',
  Metrics,
  Progress,
  Collections,
  useHistory,
};
