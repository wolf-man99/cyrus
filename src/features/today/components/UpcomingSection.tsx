import { CalendarDays } from 'lucide-react';
import { formatTime, parseISODate, relativeDayLabel } from '@/lib/dates';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import type { Task } from '@/domain/types';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';

interface UpcomingSectionProps {
  tasks: Task[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry(): void;
}

const MAX_UPCOMING = 4;

export function UpcomingSection({ tasks, isPending, error, onRetry }: UpcomingSectionProps) {
  const items = tasks?.slice(0, MAX_UPCOMING);
  return (
    <section aria-labelledby="upcoming-heading">
      <SectionHeader id="upcoming-heading" title="Upcoming" meta="Next 7 days" />
      <div className="mt-2">
        {isPending ? (
          <SkeletonRows rows={2} />
        ) : error ? (
          <ErrorState title="Couldn’t load upcoming activities" error={error} onRetry={onRetry} />
        ) : items && items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((t) => {
              const date = parseISODate(t.dueDate!);
              const domain = t.domain ? LIFE_DOMAIN_CONFIG[t.domain] : null;
              return (
                <li key={t.id} className="flex min-h-[4.25rem] items-center gap-3.5 rounded-row border border-line bg-surface/75 px-4 py-3">
                  <div
                    aria-hidden
                    className="flex size-11 shrink-0 flex-col items-center justify-center rounded-[0.875rem] bg-white/[0.06] leading-none"
                  >
                    <span className="text-[0.625rem] font-semibold tracking-wider text-secondary uppercase">
                      {new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)}
                    </span>
                    <span className="mt-0.5 text-headline font-bold tabular">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-callout font-semibold">{t.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-footnote text-muted">
                      {relativeDayLabel(t.dueDate!)}
                      {domain && (
                        <>
                          <span aria-hidden>·</span>
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: domain.accent }} />
                          {domain.name}
                        </>
                      )}
                    </p>
                  </div>
                  {t.dueTime && <span className="shrink-0 text-subhead text-muted tabular">{formatTime(t.dueTime)}</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<CalendarDays className="size-5" />}
            title="A clear week ahead"
            description="Tasks you schedule for the coming days will appear here."
          />
        )}
      </div>
    </section>
  );
}
