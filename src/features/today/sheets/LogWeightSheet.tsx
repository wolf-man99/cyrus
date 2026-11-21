import { useState, type FormEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { AmountInput } from '@/components/ui/AmountInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useLogWeight, useWeightLogs } from '@/data/hooks/useData';
import { useProfile } from '@/data/hooks/useProfile';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, parseDecimal, weightEntrySchema } from '@/domain/schemas';
import type { WeightUnit } from '@/domain/types';
import { formatNumber } from '@/lib/format';
import { timeAgo } from '@/lib/dates';

interface SheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function LogWeightSheet({ open, onOpenChange }: SheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log weight" description="Takes two seconds. Same time each day is best.">
      <WeightForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function WeightForm({ onDone }: { onDone(): void }) {
  const profile = useProfile();
  const logs = useWeightLogs();
  const logWeight = useLogWeight();
  const feedback = useSaveFeedback();
  const last = logs.data?.[0];

  const [unit, setUnit] = useState<WeightUnit>(last?.unit ?? profile.data?.weightUnit ?? 'kg');
  const [raw, setRaw] = useState<string>(last ? String(last.value) : '');
  const [error, setError] = useState<string>();

  // Pre-fill once the latest entry arrives.
  const [prefilled, setPrefilled] = useState(Boolean(last));
  if (!prefilled && last) {
    setPrefilled(true);
    setRaw(String(last.value));
    setUnit(last.unit);
  }

  const step = (delta: number) => {
    const current = parseDecimal(raw);
    const base = Number.isFinite(current) ? current : (last?.value ?? 70);
    setRaw((Math.round((base + delta) * 10) / 10).toFixed(1));
    setError(undefined);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = weightEntrySchema.safeParse({ value: parseDecimal(raw), unit });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).value ?? 'Check the value');
      return;
    }
    logWeight.mutate(parsed.data, {
      onSuccess: (log) => {
        feedback.saved(`Logged ${formatNumber(log.value)} ${log.unit}`);
        onDone();
      },
      onError: (err) => feedback.failed(err),
    });
  };

  const current = parseDecimal(raw);
  const delta = last && Number.isFinite(current) && last.unit === unit ? current - last.value : null;

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-center justify-between gap-3">
        <IconButton label="Decrease by 0.1" icon={<Minus className="size-5" />} size="lg" onClick={() => step(-0.1)} />
        <AmountInput
          label={`Weight in ${unit}`}
          suffix={unit}
          chars={4.2}
          value={raw}
          placeholder="0.0"
          error={error}
          autoFocus
          onChange={(e) => {
            setRaw(e.target.value);
            setError(undefined);
          }}
        />
        <IconButton label="Increase by 0.1" icon={<Plus className="size-5" />} size="lg" onClick={() => step(0.1)} />
      </div>

      <p className="mt-3 text-center text-footnote text-muted" aria-live="polite">
        {logs.isPending
          ? 'Loading your last entry…'
          : last
            ? (
                <>
                  Last: {formatNumber(last.value)} {last.unit} · {timeAgo(last.loggedAt)}
                  {delta !== null && Math.abs(delta) >= 0.05 && (
                    <span className={delta < 0 ? 'text-success' : 'text-warning'}>
                      {' '}
                      ({delta > 0 ? '+' : ''}
                      {formatNumber(delta)})
                    </span>
                  )}
                </>
              )
            : 'Your first entry — welcome.'}
      </p>

      <SegmentedControl
        label="Unit"
        className="mx-auto mt-6 w-44"
        value={unit}
        onChange={setUnit}
        options={[
          { value: 'kg', label: 'kg' },
          { value: 'lb', label: 'lb' },
        ]}
      />

      <SheetFooter>
        <Button type="submit" block size="lg" loading={logWeight.isPending}>
          Save weight
        </Button>
      </SheetFooter>
    </form>
  );
}
