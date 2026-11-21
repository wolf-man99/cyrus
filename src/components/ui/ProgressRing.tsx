import { useId } from 'react';

interface ProgressRingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  trackOpacity?: number;
  label?: string;
}

export function ProgressRing({ value, size = 36, stroke = 3.5, color, trackOpacity = 0.12, label }: ProgressRingProps) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? `${Math.round(clamped * 100)}% complete`}
      className="-rotate-90"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color ?? '#8538F5'} />
          <stop offset="100%" stopColor={color ?? '#E04BD6'} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeOpacity={trackOpacity} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  );
}
