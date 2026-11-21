import { Planet } from '@/components/brand/Planet';
import { formatPercent } from '@/lib/format';
import type { DailyProgress } from '@/domain/progress';

interface TodayHeroProps {
  progress: DailyProgress | null;
}

/** Orbit-style planet with the day's progress as the orbit ring, plus the two headline numbers. */
export function TodayHero({ progress }: TodayHeroProps) {
  const ratio = progress?.ratio ?? 0;
  return (
    <section aria-label="Daily progress" className="relative">
      <Planet progress={ratio} className="mx-auto w-[min(78vw,20rem)]" />
      <div className="mt-2 flex items-end justify-between px-1">
        <div>
          <p className="font-display text-[2.5rem] leading-none font-semibold tabular">
            {progress ? progress.done : '–'}
            <span className="text-title font-semibold text-subtle">/{progress?.total ?? '–'}</span>
          </p>
          <p className="mt-1.5 text-callout text-muted">Done today</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[2.5rem] leading-none font-semibold tabular">{progress ? formatPercent(ratio) : '–'}</p>
          <p className="mt-1.5 text-callout text-muted">Day progress</p>
        </div>
      </div>
    </section>
  );
}
