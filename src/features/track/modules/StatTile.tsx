import type { ReactNode } from 'react';

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-row border border-line bg-surface/75 px-4 py-3.5">
      <p className="text-footnote text-muted">{label}</p>
      <p className="mt-1 font-display text-title font-bold tabular">{value}</p>
      {hint && <p className="mt-0.5 text-footnote text-subtle">{hint}</p>}
    </div>
  );
}
