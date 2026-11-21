import { useId, useState, type PointerEvent } from 'react';
import type { WeightLog } from '@/domain/types';
import { formatNumber } from '@/lib/format';

const W = 320;
const H = 140;
const PAD = { top: 16, right: 12, bottom: 22, left: 12 };

const dayLabel = (iso: string) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(iso));

/** Single-series weight trend: 2px line, soft area, end label, crosshair readout on hover. */
export function WeightTrendChart({ logs }: { logs: WeightLog[] }) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const points = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const t0 = new Date(points[0]!.loggedAt).getTime();
  const t1 = new Date(points.at(-1)!.loggedAt).getTime();
  const x = (iso: string) => PAD.left + ((new Date(iso).getTime() - t0) / (t1 - t0 || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom);

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.loggedAt).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.at(-1)!.loggedAt).toFixed(1)},${H - PAD.bottom} L${PAD.left},${H - PAD.bottom} Z`;
  const last = points.at(-1)!;
  const shown = active !== null ? points[active]! : last;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.loggedAt) - px) < Math.abs(x(points[best]!.loggedAt) - px)) best = i;
    });
    setActive(best);
  };

  return (
    <figure className="rounded-card border border-line bg-surface/75 p-4">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-subhead font-medium text-muted">Weight trend</span>
        <span className="text-subhead text-fg tabular" aria-live="polite">
          {formatNumber(shown.value)} {shown.unit} <span className="text-muted">· {dayLabel(shown.loggedAt)}</span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full touch-none"
        role="img"
        aria-label={`Weight from ${formatNumber(points[0]!.value)} to ${formatNumber(last.value)} ${last.unit} over ${points.length} entries`}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-physical)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-physical)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="white" strokeOpacity="0.08" />
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--color-physical)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && (
          <line
            x1={x(shown.loggedAt)}
            x2={x(shown.loggedAt)}
            y1={PAD.top - 6}
            y2={H - PAD.bottom}
            stroke="white"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
          />
        )}
        <circle cx={x(shown.loggedAt)} cy={y(shown.value)} r="4.5" fill="var(--color-physical)" stroke="var(--color-surface)" strokeWidth="2" />
        <text x={PAD.left} y={H - 6} className="fill-[var(--color-subtle)] text-[11px]">
          {dayLabel(points[0]!.loggedAt)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-[var(--color-subtle)] text-[11px]">
          {dayLabel(last.loggedAt)}
        </text>
      </svg>
    </figure>
  );
}
