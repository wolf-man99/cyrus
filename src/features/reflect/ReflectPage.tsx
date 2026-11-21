import { useState } from 'react';
import { CalendarDays, CalendarRange, Moon, NotebookPen, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { REFLECTION_TEMPLATES } from '@/domain/reflections';
import type { ReflectionPeriod } from '@/domain/types';
import { useReflections } from '@/data/hooks/useReflections';
import { formatShortDate } from '@/lib/dates';

const ICONS: Record<ReflectionPeriod, LucideIcon> = { daily: Moon, weekly: CalendarDays, monthly: CalendarRange };
const PERIODS: ReflectionPeriod[] = ['daily', 'weekly', 'monthly'];

/** REFLECT — daily, weekly and monthly reviews. Templates are config-driven (`domain/reflections.ts`). */
export function ReflectPage() {
  const [period, setPeriod] = useState<ReflectionPeriod>('daily');
  const history = useReflections(period);

  return (
    <>
      <PageHeader title="Reflect" description="Short daily, weekly and monthly reviews of how life is going" />

      <section aria-label="Reviews" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PERIODS.map((p) => {
          const t = REFLECTION_TEMPLATES[p];
          const Icon = ICONS[p];
          return (
            <article key={p} className="rounded-card border border-line bg-surface/75 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.06] text-fg">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h2 className="text-headline font-semibold">{t.title}</h2>
                  <p className="text-footnote text-muted">{t.cadence}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {t.checkIn && <li className="text-subhead text-muted">Mood & energy check-in</li>}
                {t.prompts.map((prompt) => (
                  <li key={prompt.id} className="text-subhead text-muted">
                    {prompt.label}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex flex-wrap gap-1.5">
                {t.insights.map((i) => (
                  <span key={i} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-caption text-muted">
                    {i}
                  </span>
                ))}
              </p>
            </article>
          );
        })}
      </section>
      <p className="mt-3 px-1 text-footnote text-subtle">
        Writing reviews arrives in the next build phase. Structure, storage and history are already in place.
      </p>

      <section aria-labelledby="past-heading" className="mt-10">
        <SectionHeader id="past-heading" title="Past reflections" />
        <SegmentedControl
          label="Reflection period"
          className="mt-2 max-w-sm"
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((p) => ({ value: p, label: p[0]!.toUpperCase() + p.slice(1) }))}
        />
        <div className="mt-4">
          {history.isPending ? (
            <SkeletonRows rows={2} />
          ) : history.isError ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : history.data.length === 0 ? (
            <EmptyState
              icon={<NotebookPen className="size-5" />}
              title={`No ${period} reflections yet`}
              description="Saved reviews are kept here, newest first"
            />
          ) : (
            <ul className="space-y-2">
              {history.data.map((r) => (
                <li key={r.id} className="rounded-row border border-line bg-surface/75 px-4 py-3">
                  <p className="text-callout font-semibold">{formatShortDate(r.periodStart)}</p>
                  <p className="line-clamp-2 text-footnote text-muted">{Object.values(r.responses).filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
