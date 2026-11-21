import { ListChecks, Star } from 'lucide-react';
import type { ISODate } from '@/lib/dates';
import type { Task } from '@/domain/types';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { TaskRow } from './TaskRow';

interface TaskSectionProps {
  tasks: Task[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry(): void;
  day: ISODate;
  onToggle(task: Task, completed: boolean): void;
  onAdd(): void;
}

const MAX_PRIORITIES = 3;

export function PrioritiesSection({ tasks, isPending, error, onRetry, day, onToggle, onAdd }: TaskSectionProps) {
  const priorities = tasks?.filter((t) => t.isPriority).slice(0, MAX_PRIORITIES);
  const done = priorities?.filter((t) => t.completedAt).length ?? 0;
  return (
    <section aria-labelledby="priorities-heading">
      <SectionHeader
        id="priorities-heading"
        title="Today’s priorities"
        meta={priorities && priorities.length > 0 ? `${done} of ${priorities.length}` : undefined}
      />
      <div className="mt-2">
        {isPending ? (
          <SkeletonRows rows={3} />
        ) : error ? (
          <ErrorState title="Couldn’t load your priorities" error={error} onRetry={onRetry} />
        ) : priorities && priorities.length > 0 ? (
          <ul className="space-y-2">
            {priorities.map((t) => (
              <TaskRow key={t.id} task={t} day={day} onToggle={onToggle} />
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<Star className="size-5" />}
            title="No priorities yet"
            description="Pick up to three things that would make today a win"
            action={
              <Button size="sm" variant="secondary" onClick={onAdd}>
                Set a priority
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}

export function TasksSection({ tasks, isPending, error, onRetry, day, onToggle, onAdd }: TaskSectionProps) {
  const priorityIds = new Set(tasks?.filter((t) => t.isPriority).slice(0, MAX_PRIORITIES).map((t) => t.id));
  const rest = tasks?.filter((t) => !priorityIds.has(t.id));
  const open = rest?.filter((t) => !t.completedAt).length ?? 0;
  return (
    <section aria-labelledby="tasks-heading">
      <SectionHeader
        id="tasks-heading"
        title="Tasks & commitments"
        meta={rest && rest.length > 0 ? `${open} open` : undefined}
      />
      <div className="mt-2">
        {isPending ? (
          <SkeletonRows rows={4} />
        ) : error ? (
          <ErrorState title="Couldn’t load your tasks" error={error} onRetry={onRetry} />
        ) : rest && rest.length > 0 ? (
          <ul className="space-y-2">
            {rest.map((t) => (
              <TaskRow key={t.id} task={t} day={day} onToggle={onToggle} />
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<ListChecks className="size-5" />}
            title="Nothing else on your plate"
            description="Add a task, or give it a time to make it a commitment"
            action={
              <Button size="sm" variant="secondary" onClick={onAdd}>
                Add task
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}
