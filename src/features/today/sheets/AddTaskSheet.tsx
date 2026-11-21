import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/Field';
import { SwitchRow } from '@/components/ui/Switch';
import { useCreateTask } from '@/data/hooks/useTasks';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, newTaskSchema } from '@/domain/schemas';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import type { LifeDomain } from '@/domain/types';
import { addDays, relativeDayLabel, today } from '@/lib/dates';

type When = 'today' | 'tomorrow' | 'date';

interface AddTaskSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  defaultPriority?: boolean;
}

export function AddTaskSheet({ open, onOpenChange, defaultPriority = false }: AddTaskSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={defaultPriority ? 'New priority' : 'Add task'}>
      <TaskForm defaultPriority={defaultPriority} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function TaskForm({ defaultPriority, onDone }: { defaultPriority: boolean; onDone(): void }) {
  const createTask = useCreateTask();
  const feedback = useSaveFeedback();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>('today');
  const [date, setDate] = useState(addDays(today(), 2));
  const [time, setTime] = useState('');
  const [isPriority, setIsPriority] = useState(defaultPriority);
  const [domain, setDomain] = useState<LifeDomain | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dueDate = when === 'today' ? today() : when === 'tomorrow' ? addDays(today(), 1) : date;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = newTaskSchema.safeParse({ title, dueDate, dueTime: time || null, isPriority, domain });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    createTask.mutate(parsed.data, {
      onSuccess: (task) => {
        feedback.saved(
          task.dueDate === today() ? 'Added to today' : `Scheduled for ${relativeDayLabel(task.dueDate!).toLowerCase()}`,
        );
        onDone();
      },
      onError: (err) => feedback.failed(err),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <TextField
        label="Task"
        placeholder="What needs doing?"
        autoFocus
        enterKeyHint="done"
        maxLength={200}
        value={title}
        error={errors.title}
        onChange={(e) => {
          setTitle(e.target.value);
          setErrors((er) => ({ ...er, title: '' }));
        }}
      />

      <div>
        <ChipGroup
          label="When"
          value={when}
          onChange={(v) => v && setWhen(v)}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'date', label: 'Pick a date' },
          ]}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {when === 'date' && (
            <TextField
              label="Date"
              type="date"
              min={today()}
              value={date}
              error={errors.dueDate}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <TextField
            label="Time (optional)"
            type="time"
            value={time}
            error={errors.dueTime}
            hint={time ? undefined : 'Adds it as a commitment'}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <SwitchRow
        label="Today’s priority"
        description="Priorities sit at the top of your day"
        icon={<Star className="size-5" fill={isPriority ? 'currentColor' : 'none'} />}
        checked={isPriority}
        onChange={setIsPriority}
      />

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
        <Button type="submit" block size="lg" loading={createTask.isPending}>
          Add task
        </Button>
      </SheetFooter>
    </form>
  );
}
