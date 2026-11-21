import type { Project } from '@/domain/types';
import { formatShortDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

const STATUS_LABEL: Record<Project['status'], string> = {
  idea: 'Idea',
  active: 'Active',
  paused: 'Paused',
  completed: 'Done',
  dropped: 'Dropped',
};

/** Projects, ventures, ideas and experiments share one row design. */
export function ProjectList({ items, onOpen }: { items: Project[]; onOpen(p: Project): void }) {
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {items.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="w-full rounded-row border border-line bg-surface/75 px-4 py-3 text-left transition-colors hover:border-white/15 hover:bg-surface"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-callout font-semibold">{p.title}</span>
              <span
                className={cn(
                  'shrink-0 text-footnote',
                  p.status === 'active' ? 'text-success' : p.status === 'dropped' ? 'text-subtle' : 'text-muted',
                )}
              >
                {p.kind === 'experiment' && p.status === 'active' ? 'Running' : STATUS_LABEL[p.status]}
              </span>
            </span>
            {p.kind === 'experiment' ? (
              <>
                {p.hypothesis && <span className="mt-1 block text-subhead text-muted">{p.hypothesis}</span>}
                {p.outcome && <span className="mt-1 block text-subhead">Result: {p.outcome}</span>}
              </>
            ) : (
              (p.description || p.outcome) && <span className="mt-1 block text-subhead text-muted">{p.outcome ?? p.description}</span>
            )}
            {(p.startedAt || p.completedAt) && (
              <span className="mt-1.5 block text-footnote text-subtle">
                {p.completedAt ? `Finished ${formatShortDate(p.completedAt)}` : `Started ${formatShortDate(p.startedAt!)}`}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export const byRecency = (a: Project, b: Project) =>
  Number(a.status !== 'active') - Number(b.status !== 'active') || b.updatedAt.localeCompare(a.updatedAt);
