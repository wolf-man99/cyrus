import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { Bucket } from '@/domain/series';
import { monthLabel, shortDate, type Series } from './chartUtils';

interface BarChartProps {
  /** One or two series sharing the same buckets. */
  series: Series[];
  bucket: Bucket;
  format: (value: number) => string;
  height?: number;
  label: string;
}

/**
 * Bucketed bars (day/week/month). One series, or two side by side for comparisons
 * like income vs spending. Bars are thin with rounded tops; hover/tap shows the values.
 */
export function BarChart({ series, bucket, format, height = 140, label }: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const buckets = series[0]?.points ?? [];
  if (buckets.length === 0) return null;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const shown = hover ?? buckets.length - 1;
  const bucketText = (d: string) => (bucket === 'month' ? monthLabel(d) : bucket === 'week' ? `Week of ${shortDate(d)}` : shortDate(d));

  return (
    <figure>
      <figcaption className="flex min-h-5 flex-wrap items-baseline justify-between gap-x-3 text-footnote tabular" aria-live="polite">
        <span className="flex flex-wrap gap-x-3">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-muted">
              <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
              <span className="text-fg">{format(s.points[shown]?.value ?? 0)}</span>
            </span>
          ))}
        </span>
        <span className="text-subtle">{bucketText(buckets[shown]!.date)}</span>
      </figcaption>
      <div
        role="img"
        aria-label={label}
        className="mt-3 flex items-end gap-1 border-b border-white/10"
        style={{ height }}
        onPointerLeave={() => setHover(null)}
      >
        {buckets.map((b, i) => (
          <div
            key={b.date}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
            onPointerEnter={() => setHover(i)}
            onPointerDown={() => setHover(i)}
          >
            {series.map((s) => {
              const v = s.points[i]?.value ?? 0;
              return (
                <div
                  key={s.label}
                  className={cn('w-full max-w-4 rounded-t-[3px] transition-opacity', hover !== null && hover !== i && 'opacity-45')}
                  style={{ height: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%`, background: s.color }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
        <span>{bucketText(buckets[0]!.date).replace('Week of ', '')}</span>
        <span>{bucketText(buckets.at(-1)!.date).replace('Week of ', '')}</span>
      </div>
    </figure>
  );
}
