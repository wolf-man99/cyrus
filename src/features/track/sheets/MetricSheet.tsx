import { useState, type FormEvent } from 'react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { AmountInput } from '@/components/ui/AmountInput';
import { useMetrics, useMutate } from '@/data/hooks/useData';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, metricEntrySchema, parseDecimal, type MetricEntry } from '@/domain/schemas';
import type { LifeDomain } from '@/domain/types';
import { formatNumber } from '@/lib/format';
import { timeAgo } from '@/lib/dates';

export interface MetricOption {
  metric: string;
  label: string;
  unit: string;
}

export const BODY_MEASUREMENTS: MetricOption[] = [
  { metric: 'waist', label: 'Waist', unit: 'cm' },
  { metric: 'chest', label: 'Chest', unit: 'cm' },
  { metric: 'hips', label: 'Hips', unit: 'cm' },
  { metric: 'arm', label: 'Arm', unit: 'cm' },
  { metric: 'thigh', label: 'Thigh', unit: 'cm' },
  { metric: 'body_fat', label: 'Body fat', unit: '%' },
];

export const BALANCES: MetricOption[] = [
  { metric: 'savings_balance', label: 'Savings', unit: 'currency' },
  { metric: 'debt_balance', label: 'Debt', unit: 'currency' },
];

interface MetricSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  domain: LifeDomain;
  title: string;
  options: MetricOption[];
  currency?: string;
}

export function MetricSheet({ open, onOpenChange, ...props }: MetricSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={props.title}>
      <MetricForm {...props} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function MetricForm({ domain, options, currency = 'USD', onDone }: Omit<MetricSheetProps, 'open' | 'onOpenChange' | 'title'> & { onDone(): void }) {
  const feedback = useSaveFeedback();
  const [metric, setMetric] = useState(options[0]!.metric);
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string>();
  const option = options.find((o) => o.metric === metric)!;
  const unit = option.unit === 'currency' ? currency : option.unit;
  const recent = useMetrics({ domain, metrics: [metric], limit: 1 });
  const last = recent.data?.[0];
  const record = useMutate((r, input: MetricEntry) => r.metrics.record(input), ['metrics']);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = metricEntrySchema.safeParse({ domain, metric, value: parseDecimal(raw), unit });
    if (!parsed.success) return setError(fieldErrors(parsed.error).value ?? 'Enter a value');
    record.mutate(parsed.data, {
      onSuccess: () => (feedback.saved(`${option.label} updated`), onDone()),
      onError: (err) => feedback.failed(err),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {options.length > 1 && (
        <ChipGroup
          label="What are you updating?"
          value={metric}
          onChange={(v) => {
            if (v) setMetric(v);
            setRaw('');
            setError(undefined);
          }}
          options={options.map((o) => ({ value: o.metric, label: o.label }))}
        />
      )}
      <AmountInput
        label={`${option.label} in ${unit}`}
        suffix={unit}
        chars={5}
        placeholder={last ? String(last.value) : '0'}
        value={raw}
        error={error}
        autoFocus
        onChange={(e) => {
          setRaw(e.target.value);
          setError(undefined);
        }}
      />
      <p className="text-center text-footnote text-muted" aria-live="polite">
        {last ? `Last: ${formatNumber(last.value)} ${unit} · ${timeAgo(last.recordedAt)}` : 'Your first entry'}
      </p>
      <SheetFooter>
        <Button type="submit" block size="lg" loading={record.isPending}>
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}
