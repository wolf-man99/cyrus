import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** A change with what it compares to, e.g. "−1.2 kg in last 30 days". */
  change?: { text: string; tone: 'good' | 'bad' | 'neutral' } | null;
  hint?: ReactNode;
}

export function StatTile({ label, value, change, hint }: StatTileProps) {
  return (
    <div className="min-w-0 rounded-row border border-line bg-surface/75 px-4 py-3.5">
      <p className="truncate text-footnote text-muted">{label}</p>
      <p className="mt-1 truncate font-display text-title font-semibold tabular">{value}</p>
      {change ? (
        <p
          className={cn(
            'mt-0.5 truncate text-footnote tabular',
            change.tone === 'good' ? 'text-success' : change.tone === 'bad' ? 'text-danger' : 'text-subtle',
          )}
        >
          {change.text}
        </p>
      ) : hint ? (
        <p className="mt-0.5 truncate text-footnote text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{children}</div>;
}

/** Signed change text, e.g. "+3", "−1.2 kg". Uses a real minus sign. */
export function signed(n: number, digits = 1, suffix = ''): string {
  const rounded = Number(n.toFixed(digits));
  const text = new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Math.abs(rounded));
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${text}${suffix}`;
}
