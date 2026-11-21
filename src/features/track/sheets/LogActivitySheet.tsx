import { useState, type FormEvent } from 'react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { useGoals, useMutate } from '@/data/hooks/useData';
import { useProfile } from '@/data/hooks/useProfile';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { activityEntrySchema, fieldErrors, parseDecimal, type ActivityEntry } from '@/domain/schemas';
import type { ActivityKindConfig } from '../activityKinds';

interface LogActivitySheetProps {
  config: ActivityKindConfig | null;
  onOpenChange(open: boolean): void;
}

export function LogActivitySheet({ config, onOpenChange }: LogActivitySheetProps) {
  return (
    <Sheet open={config !== null} onOpenChange={onOpenChange} title={config ? `Log ${config.label.toLowerCase()}` : ''}>
      {config && <ActivityForm config={config} onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

function ActivityForm({ config, onDone }: { config: ActivityKindConfig; onDone(): void }) {
  const feedback = useSaveFeedback();
  const currency = useProfile().data?.currency ?? 'USD';
  const goals = useGoals({ domain: config.domain });
  const log = useMutate((r, input: ActivityEntry) => r.activities.create(input), ['activities']);
  const [title, setTitle] = useState('');
  const [value, setValue] = useState<string>(config.value?.presets?.[1]?.toString() ?? '');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeGoals = goals.data?.filter((g) => g.status === 'active') ?? [];
  const unit = config.value?.currency ? currency : (config.value?.unit ?? null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const numeric = value.trim() ? parseDecimal(value) : null;
    const errs: Record<string, string> = {};
    if (config.value?.required && (numeric === null || Number.isNaN(numeric))) errs.value = `Enter ${config.value.label.toLowerCase()}`;
    if (config.notes?.required && !notes.trim()) errs.notes = 'Write a few words';
    if (Object.keys(errs).length) return setErrors(errs);

    const parsed = activityEntrySchema.safeParse({
      domain: config.domain,
      kind: config.kind,
      title: config.title ? title : config.label,
      value: numeric,
      unit,
      notes: notes.trim() || null,
      details: { ...(type ? { type } : {}), ...(rating ? { rating } : {}) },
      goalId,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    log.mutate(parsed.data, {
      onSuccess: () => (feedback.saved(`${config.label} logged`), onDone()),
      onError: (err) => feedback.failed(err),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {config.title && (
        <TextField
          label={config.title.label}
          placeholder={config.title.placeholder}
          autoFocus
          maxLength={160}
          value={title}
          error={errors.title}
          onChange={(e) => {
            setTitle(e.target.value);
            setErrors((er) => ({ ...er, title: '' }));
          }}
        />
      )}
      {config.types && <ChipGroup label="Type" allowDeselect value={type} onChange={setType} options={config.types.map((t) => ({ value: t, label: t }))} />}
      {config.value && (
        <div>
          {config.value.presets && (
            <ChipGroup
              label={config.value.label}
              value={config.value.presets.includes(Number(value)) ? Number(value) : null}
              onChange={(v) => v !== null && setValue(String(v))}
              options={config.value.presets.map((p) => ({ value: p, label: `${p} ${config.value!.unit}` }))}
            />
          )}
          <TextField
            className={config.value.presets ? 'mt-3' : ''}
            label={config.value.presets ? `Custom ${config.value.label.toLowerCase()}` : `${config.value.label} (${unit})`}
            hideLabel={Boolean(config.value.presets)}
            placeholder={config.value.presets ? 'Custom' : '0'}
            inputMode="decimal"
            value={value}
            error={errors.value}
            onChange={(e) => {
              setValue(e.target.value);
              setErrors((er) => ({ ...er, value: '' }));
            }}
          />
        </div>
      )}
      {config.rating && (
        <ChipGroup
          label={config.rating}
          allowDeselect
          value={rating}
          onChange={setRating}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        />
      )}
      {config.notes && (
        <TextArea
          label={config.notes.label}
          placeholder={config.notes.placeholder}
          autoFocus={!config.title}
          value={notes}
          error={errors.notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setErrors((er) => ({ ...er, notes: '' }));
          }}
        />
      )}
      {activeGoals.length > 0 && (
        <ChipGroup
          label="Counts towards a goal (optional)"
          allowDeselect
          value={goalId}
          onChange={setGoalId}
          options={activeGoals.map((g) => ({ value: g.id, label: g.title }))}
        />
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={log.isPending}>
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}
