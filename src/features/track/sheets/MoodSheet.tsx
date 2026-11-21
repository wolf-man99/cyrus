import { useState, type FormEvent } from 'react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useMutate } from '@/data/hooks/useData';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { ScalePicker } from '@/components/ui/ScalePicker';

export const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
export const ENERGY_LABELS = ['Drained', 'Tired', 'Steady', 'Energised', 'Charged'];

/** Two taps: mood and energy (1–5), with an optional note. */
export function MoodSheet({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Check in" description="How are you, right now?">
      <MoodForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function MoodForm({ onDone }: { onDone(): void }) {
  const feedback = useSaveFeedback();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useMutate(
    async (r, v: { mood: number; energy: number; note: string | null }) => {
      const recordedAt = new Date().toISOString();
      await r.metrics.record({ domain: 'mental', metric: 'mood', value: v.mood, unit: null, note: v.note, recordedAt });
      await r.metrics.record({ domain: 'mental', metric: 'energy', value: v.energy, unit: null, note: null, recordedAt });
    },
    ['metrics'],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!mood || !energy) return setError('Pick both mood and energy');
    save.mutate(
      { mood, energy, note: note.trim() || null },
      { onSuccess: () => (feedback.saved('Check-in saved'), onDone()), onError: (err) => feedback.failed(err) },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <ScalePicker label="Mood" labels={MOOD_LABELS} value={mood} onChange={(v) => (setMood(v), setError(null))} />
      <ScalePicker label="Energy" labels={ENERGY_LABELS} value={energy} onChange={(v) => (setEnergy(v), setError(null))} />
      <TextField label="Note (optional)" placeholder="What’s behind it?" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && (
        <p role="alert" className="text-footnote text-danger">
          {error}
        </p>
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          Save check-in
        </Button>
      </SheetFooter>
    </form>
  );
}
