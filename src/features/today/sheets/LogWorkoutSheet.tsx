import { useState, type FormEvent } from 'react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FieldError, TextField } from '@/components/ui/Field';
import { useLogWorkout } from '@/data/hooks/useLogs';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, workoutEntrySchema } from '@/domain/schemas';
import { WORKOUT_TYPES, type WorkoutIntensity, type WorkoutType } from '@/domain/types';

const DURATIONS = [15, 30, 45, 60, 90];

export function LogWorkoutSheet({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log workout" description="What did you do, and for how long?">
      <WorkoutForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function WorkoutForm({ onDone }: { onDone(): void }) {
  const logWorkout = useLogWorkout();
  const feedback = useSaveFeedback();
  const [type, setType] = useState<WorkoutType | null>(null);
  const [duration, setDuration] = useState<number | null>(30);
  const [custom, setCustom] = useState('');
  const [intensity, setIntensity] = useState<WorkoutIntensity | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minutes = custom.trim() ? Number(custom) : duration;
    const parsed = workoutEntrySchema.safeParse({ workoutType: type ?? undefined, durationMin: minutes ?? undefined, intensity });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    logWorkout.mutate(parsed.data, {
      onSuccess: (w) => {
        feedback.saved(`${w.workoutType} · ${w.durationMin} min logged`);
        onDone();
      },
      onError: (err) => feedback.failed(err),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <ChipGroup
          label="Type"
          options={WORKOUT_TYPES.map((t) => ({ value: t, label: t }))}
          value={type}
          onChange={(v) => {
            setType(v);
            setErrors((e) => ({ ...e, workoutType: '' }));
          }}
        />
        <FieldError message={errors.workoutType} />
      </div>

      <div>
        <ChipGroup
          label="Duration"
          options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))}
          value={custom.trim() ? null : duration}
          onChange={(v) => {
            setDuration(v);
            setCustom('');
            setErrors((e) => ({ ...e, durationMin: '' }));
          }}
        />
        <TextField
          className="mt-3"
          label="Custom duration (minutes)"
          hideLabel
          placeholder="Custom minutes"
          inputMode="numeric"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value.replace(/[^\d]/g, '').slice(0, 3));
            setErrors((er) => ({ ...er, durationMin: '' }));
          }}
          error={errors.durationMin || undefined}
        />
      </div>

      <ChipGroup
        label="Intensity (optional)"
        allowDeselect
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'hard', label: 'Hard' },
        ]}
        value={intensity}
        onChange={setIntensity}
      />

      <SheetFooter>
        <Button type="submit" block size="lg" loading={logWorkout.isPending}>
          Save workout
        </Button>
      </SheetFooter>
    </form>
  );
}
