import { cn } from '@/lib/cn';
import { formatTime, relativeDayLabel, type ISODate } from '@/lib/dates';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import type { Task } from '@/domain/types';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { tap } from '@/lib/haptics';

interface TaskRowProps {
  task: Task;
  day: ISODate;
  onToggle(task: Task, completed: boolean): void;
}

export function TaskRow({ task, day, onToggle }: TaskRowProps) {
  const done = task.completedAt !== null;
  const carriedOver = task.dueDate !== null && task.dueDate < day;
  const domain = task.domain ? LIFE_DOMAIN_CONFIG[task.domain] : null;

  return (
    <li
      className={cn(
        'flex min-h-[4.25rem] items-center gap-3.5 rounded-row border border-line bg-surface/75 px-4 py-3 transition-opacity duration-300',
        done && 'opacity-60',
      )}
    >
      <CheckCircle
        checked={done}
        label={`Mark “${task.title}” as ${done ? 'not done' : 'done'}`}
        onChange={(checked) => {
          tap();
          onToggle(task, checked);
        }}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-callout font-semibold transition-colors', done && 'text-muted line-through decoration-white/30')}>
          {task.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-footnote text-muted">
          {domain && (
            <>
              <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: domain.accent }} />
              <span>{domain.name}</span>
            </>
          )}
          {carriedOver && !done && (
            <span className="text-warning">
              {domain && '· '}Carried over from {relativeDayLabel(task.dueDate!, day).toLowerCase()}
            </span>
          )}
        </p>
      </div>
      {task.dueTime && (
        <span className={cn('shrink-0 text-subhead tabular', done ? 'text-subtle' : 'text-muted')}>{formatTime(task.dueTime)}</span>
      )}
    </li>
  );
}
