import type { ReactNode } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RANGE_OPTIONS, type RangeKey } from '../range';

interface ChartCardProps {
  title: string;
  range: RangeKey;
  onRangeChange(range: RangeKey): void;
  children: ReactNode;
  footer?: ReactNode;
}

/** The domain's main progress chart, with the date-range filter that also drives history. */
export function ChartCard({ title, range, onRangeChange, children, footer }: ChartCardProps) {
  return (
    <section aria-labelledby="progress-heading" className="rounded-card border border-line bg-surface/75 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="progress-heading" className="text-headline font-semibold">
          {title}
        </h2>
        <SegmentedControl
          label="Date range"
          size="sm"
          className="w-full max-w-60 sm:w-60"
          value={range}
          onChange={onRangeChange}
          options={RANGE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
        />
      </div>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-4 border-t border-line pt-4">{footer}</div>}
    </section>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <p className="flex h-36 items-center justify-center text-center text-subhead text-muted">{children}</p>;
}
