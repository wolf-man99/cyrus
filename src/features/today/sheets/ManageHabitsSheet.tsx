import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FieldLabel, TextField } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { HABIT_ICON_COMPONENTS } from '@/components/habitIcons';
import { useArchiveHabit, useCreateHabit } from '@/data/hooks/useHabits';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, newHabitSchema } from '@/domain/schemas';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import { HABIT_ICONS, type Habit, type HabitIcon, type LifeDomain } from '@/domain/types';
import { cn } from '@/lib/cn';

interface ManageHabitsSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  habits: Habit[];
}

export function ManageHabitsSheet({ open, onOpenChange, habits }: ManageHabitsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Habits" description="Keep the list short. Consistency beats volume.">
      <ManageHabits habits={habits} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function ManageHabits({ habits, onDone }: { habits: Habit[]; onDone(): void }) {
  const createHabit = useCreateHabit();
  const archiveHabit = useArchiveHabit();
  const feedback = useSaveFeedback();
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<HabitIcon>('sun');
  const [domain, setDomain] = useState<LifeDomain | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = newHabitSchema.safeParse({ title, icon, domain });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    createHabit.mutate(parsed.data, {
      onSuccess: (h) => {
        feedback.saved(`“${h.title}” added`);
        onDone();
      },
      onError: (err) => feedback.failed(err),
    });
  };

  return (
    <div className="space-y-8">
      {habits.length > 0 && (
        <section aria-label="Current habits">
          <ul className="divide-y divide-line overflow-hidden rounded-row border border-line bg-white/[0.03]">
            {habits.map((h) => {
              const Icon = HABIT_ICON_COMPONENTS[h.icon];
              return (
                <li key={h.id} className="flex items-center gap-3 py-1.5 pr-2 pl-4">
                  <Icon className="size-5 text-muted" />
                  <span className="flex-1 truncate text-callout">{h.title}</span>
                  <IconButton
                    tone="plain"
                    label={`Remove ${h.title}`}
                    icon={<Trash2 className="size-4.5" />}
                    disabled={archiveHabit.isPending}
                    onClick={() =>
                      archiveHabit.mutate(h.id, {
                        onSuccess: () => feedback.saved(`“${h.title}” removed`),
                        onError: (err) => feedback.failed(err, 'Couldn’t remove habit'),
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <form onSubmit={submit} noValidate className="space-y-6">
        <h3 className="text-headline font-semibold">New habit</h3>
        <TextField
          label="Name"
          placeholder="e.g. Stretch for 10 min"
          maxLength={60}
          value={title}
          error={errors.title}
          onChange={(e) => {
            setTitle(e.target.value);
            setErrors((er) => ({ ...er, title: '' }));
          }}
        />

        <fieldset>
          <legend>
            <FieldLabel>Icon</FieldLabel>
          </legend>
          <div className="grid grid-cols-6 gap-2">
            {HABIT_ICONS.map((name) => {
              const Icon = HABIT_ICON_COMPONENTS[name];
              const selected = name === icon;
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={name.replace('-', ' ')}
                  aria-pressed={selected}
                  onClick={() => setIcon(name)}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] active:scale-95',
                    selected ? 'border-transparent bg-primary text-fg' : 'border-line bg-white/[0.04] text-muted hover:text-fg',
                  )}
                >
                  <Icon className="size-5" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <ChipGroup
          label="Life domain (optional)"
          allowDeselect
          value={domain}
          onChange={setDomain}
          options={LIFE_DOMAIN_LIST.map((d) => ({
            value: d.id,
            label: d.name,
            icon: <span aria-hidden className="size-2 rounded-full" style={{ background: d.accent }} />,
          }))}
        />

        <SheetFooter>
          <Button type="submit" block size="lg" loading={createHabit.isPending}>
            Add habit
          </Button>
        </SheetFooter>
      </form>
    </div>
  );
}
