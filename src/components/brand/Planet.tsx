import { useId } from 'react';
import { cn } from '@/lib/cn';

interface PlanetProps {
  /** 0..1 — drawn as the glowing arc on the orbit ring. */
  progress: number;
  className?: string;
  label?: string;
}

const R = 88; // orbit radius in the 200×200 viewBox

/**
 * The CYRUS planet — a glowing sphere inside an orbit ring (Orbit-inspired).
 * The ring doubles as a progress indicator.
 */
export function Planet({ progress, className, label }: PlanetProps) {
  const gradientId = useId();
  const glowId = useId();
  const p = Math.max(0, Math.min(1, progress));
  const circumference = 2 * Math.PI * R;
  const angle = p * 2 * Math.PI - Math.PI / 2;
  const head = { x: 100 + R * Math.cos(angle), y: 100 + R * Math.sin(angle) };

  return (
    <div
      className={cn('relative aspect-square select-none', className)}
      role="img"
      aria-label={label ?? `${Math.round(p * 100)}% of today complete`}
    >
      {/* Atmosphere */}
      <div aria-hidden className="planet-atmosphere absolute inset-[16%] rounded-full" />

      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00C2FF" />
            <stop offset="100%" stopColor="#1F6BFF" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Orbit track */}
        <circle cx="100" cy="100" r={R} fill="none" stroke="#1F6BFF" strokeOpacity="0.4" strokeWidth="1" />
        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - p)}
          transform="rotate(-90 100 100)"
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        {/* Start marker + progress head */}
        <circle cx="100" cy={100 - R} r="2.6" fill="#00C2FF" />
        {p > 0.01 && (
          <circle
            cx={head.x}
            cy={head.y}
            r="4"
            fill="#2EF07A"
            filter={`url(#${glowId})`}
            style={{ transition: 'cx 900ms cubic-bezier(0.16,1,0.3,1), cy 900ms cubic-bezier(0.16,1,0.3,1)' }}
          />
        )}
      </svg>

      {/* The planet */}
      <div aria-hidden className="planet-sphere absolute inset-[29%] overflow-hidden rounded-full">
        <div className="planet-bands absolute inset-0" />
      </div>
    </div>
  );
}
