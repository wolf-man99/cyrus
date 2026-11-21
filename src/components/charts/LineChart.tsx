import { useId, useState, type PointerEvent } from 'react';
import { parseISODate } from '@/lib/dates';
import { niceDomain, shortDate, type Series } from './chartUtils';

interface LineChartProps {
  series: Series[];
  format: (value: number) => string;
  /** Fixed y-domain, e.g. [1, 5] for mood. */
  domain?: [number, number];
  height?: number;
  label: string;
}

const W = 340;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

/**
 * Time series line chart (1–2 series): 2px lines, a soft area under the first series,
 * an emphasised endpoint and a crosshair readout on hover/touch.
 */
export function LineChart({ series, format, domain, height = 150, label }: LineChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;

  const times = all.map((p) => parseISODate(p.date).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const [lo, hi] = domain ?? niceDomain(all.map((p) => p.value));
  const H = height;
  const x = (date: string) => PAD.left + ((parseISODate(date).getTime() - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  const path = (s: Series) => s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  const lead = series[0]!;
  // Dates for the crosshair come from the lead series.
  const leadPoints = lead.points;
  const active = hover !== null ? leadPoints[hover] : leadPoints.at(-1);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    leadPoints.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(leadPoints[best]!.date) - px)) best = i;
    });
    setHover(best);
  };

  const valueAt = (s: Series, date: string) => s.points.find((p) => p.date === date)?.value;

  return (
    <figure>
      <figcaption className="flex min-h-5 flex-wrap items-baseline justify-between gap-x-3 text-footnote tabular" aria-live="polite">
        <span className="flex flex-wrap gap-x-3">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-muted">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              {s.label}
              {active && valueAt(s, active.date) !== undefined && (
                <span className="text-fg">{format(valueAt(s, active.date)!)}</span>
              )}
            </span>
          ))}
        </span>
        {active && <span className="text-subtle">{shortDate(active.date)}</span>}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-pan-y"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lead.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lead.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + f * (H - PAD.top - PAD.bottom)} y2={PAD.top + f * (H - PAD.top - PAD.bottom)} stroke="currentColor" className="text-white/[0.05]" />
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="currentColor" className="text-white/10" />
        {lead.points.length > 1 && (
          <path
            d={`${path(lead)} L${x(lead.points.at(-1)!.date)},${H - PAD.bottom} L${x(lead.points[0]!.date)},${H - PAD.bottom} Z`}
            fill={`url(#${gradientId})`}
          />
        )}
        {series.map((s) => (
          <path key={s.label} d={path(s)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {active && (
          <>
            {hover !== null && (
              <line x1={x(active.date)} x2={x(active.date)} y1={PAD.top - 4} y2={H - PAD.bottom} stroke="white" strokeOpacity="0.25" strokeDasharray="3 3" />
            )}
            {series.map((s) => {
              const v = valueAt(s, active.date);
              return v === undefined ? null : (
                <circle key={s.label} cx={x(active.date)} cy={y(v)} r="4" fill={s.color} stroke="var(--color-surface)" strokeWidth="2" />
              );
            })}
          </>
        )}
        <text x={PAD.left} y={H - 6} className="fill-[var(--color-subtle)] text-[11px]">
          {shortDate(leadPoints[0]!.date)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-[var(--color-subtle)] text-[11px]">
          {shortDate(leadPoints.at(-1)!.date)}
        </text>
      </svg>
    </figure>
  );
}
