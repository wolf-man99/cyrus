import { useState, type FormEvent } from 'react';
import { Archive, CheckCircle2, RotateCcw } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { SwitchRow } from '@/components/ui/Switch';
import { useActivities, useMutate } from '@/data/hooks/useData';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, goalUpdateSchema, newGoalSchema, parseDecimal, type GoalUpdate, type NewGoal } from '@/domain/schemas';
import { GOAL_CATEGORIES, goalProgress } from '@/domain/goals';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import type { Goal, LifeDomain } from '@/domain/types';
import { formatNumber, formatPercent } from '@/lib/format';
import { timeAgo, today } from '@/lib/dates';

interface GoalSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  domain: LifeDomain;
  /** Edit this goal; omit to create a new one. */
  goal?: Goal | null;
}

export function GoalSheet({ open, onOpenChange, domain, goal }: GoalSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? 'Goal' : `New ${LIFE_DOMAIN_CONFIG[domain].name.toLowerCase()} goal`}
    >
      <GoalForm domain={domain} goal={goal ?? null} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

const optionalNumber = (raw: string) => (raw.trim() === '' ? null : parseDecimal(raw));
const toText = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

function GoalForm({ domain, goal, onDone }: { domain: LifeDomain; goal: Goal | null; onDone(): void }) {
  const feedback = useSaveFeedback();
  const create = useMutate((r, input: NewGoal) => r.goals.create(input), ['goals']);
  const update = useMutate((r, { id, patch }: { id: string; patch: GoalUpdate }) => r.goals.update(id, patch), ['goals', 'activities']);

  const [title, setTitle] = useState(goal?.title ?? '');
  const [category, setCategory] = useState<string | null>(goal?.category ?? null);
  const [measured, setMeasured] = useState(goal ? goal.targetValue !== null : true);
  const [start, setStart] = useState(toText(goal?.startValue));
  const [current, setCurrent] = useState(toText(goal?.currentValue ?? 0));
  const [target, setTarget] = useState(toText(goal?.targetValue));
  const [unit, setUnit] = useState(goal?.unit ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);

  const history = useActivities(goal ? { goalId: goal.id, kinds: ['goal_progress'], limit: 6 } : undefined, { enabled: Boolean(goal) });
  const categories = GOAL_CATEGORIES[domain] ?? [];

  const values = () => ({
    title,
    category,
    startValue: measured ? optionalNumber(start) : null,
    targetValue: measured ? optionalNumber(target) : null,
    currentValue: measured ? (optionalNumber(current) ?? 0) : (goal?.currentValue ?? 0),
    unit: measured ? unit.trim() || null : null,
    targetDate: targetDate || null,
  });

  const numberErrors = (v: ReturnType<typeof values>) => {
    const e: Record<string, string> = {};
    if (measured && (v.targetValue === null || Number.isNaN(v.targetValue))) e.targetValue = 'Enter a target';
    if (Number.isNaN(v.startValue)) e.startValue = 'Enter a number';
    if (Number.isNaN(v.currentValue)) e.currentValue = 'Enter a number';
    return e;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = values();
    const numErr = numberErrors(v);
    if (Object.keys(numErr).length) return setErrors(numErr);
    if (goal) {
      const parsed = goalUpdateSchema.safeParse(v);
      if (!parsed.success) return setErrors(fieldErrors(parsed.error));
      update.mutate(
        { id: goal.id, patch: parsed.data },
        { onSuccess: () => (feedback.saved('Goal updated'), onDone()), onError: (err) => feedback.failed(err) },
      );
    } else {
      const parsed = newGoalSchema.safeParse({ ...v, domain, description: null });
      if (!parsed.success) return setErrors(fieldErrors(parsed.error));
      create.mutate(parsed.data, { onSuccess: () => (feedback.saved('Goal added'), onDone()), onError: (err) => feedback.failed(err) });
    }
  };

  const setStatus = (status: Goal['status'], message: string) =>
    goal &&
    update.mutate(
      { id: goal.id, patch: { status } },
      { onSuccess: () => (feedback.saved(message), onDone()), onError: (err) => feedback.failed(err) },
    );

  const preview = measured ? goalProgress({ ...values(), status: 'active' }) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <TextField
        label="Goal"
        placeholder="e.g. Read 24 books this year"
        autoFocus={!goal}
        maxLength={120}
        value={title}
        error={errors.title}
        onChange={(e) => {
          setTitle(e.target.value);
          setErrors((er) => ({ ...er, title: '' }));
        }}
      />

      {categories.length > 0 && (
        <ChipGroup
          label="Type (optional)"
          allowDeselect
          value={category}
          onChange={setCategory}
          options={categories.map((c) => ({ value: c.id, label: c.label }))}
        />
      )}

      <SwitchRow
        label="Measure progress"
        description={measured ? 'Track a number towards a target' : 'A milestone you either reach or not'}
        checked={measured}
        onChange={setMeasured}
      />

      {measured && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Start" inputMode="decimal" placeholder="0" value={start} error={errors.startValue} onChange={(e) => setStart(e.target.value)} />
            <TextField label="Now" inputMode="decimal" value={current} error={errors.currentValue} onChange={(e) => setCurrent(e.target.value)} />
            <TextField
              label="Target"
              inputMode="decimal"
              value={target}
              error={errors.targetValue}
              onChange={(e) => {
                setTarget(e.target.value);
                setErrors((er) => ({ ...er, targetValue: '' }));
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Unit (optional)" placeholder="kg, books, USD…" maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
            <TextField label="By (optional)" type="date" min={goal ? undefined : today()} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          {preview !== null && (
            <p className="px-1 text-footnote text-muted tabular">
              {formatPercent(preview)} of the way there. Set a start value for goals that count down, like weight or debt.
            </p>
          )}
        </div>
      )}
      {!measured && (
        <TextField label="By (optional)" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      )}

      {goal && history.data && history.data.length > 0 && (
        <section aria-label="Progress history">
          <p className="mb-2 text-footnote font-medium text-muted">Recent progress</p>
          <ul className="divide-y divide-line rounded-row border border-line">
            {history.data.map((h) => (
              <li key={h.id} className="flex justify-between px-4 py-2.5 text-subhead tabular">
                <span>
                  {formatNumber(h.value ?? 0)} {h.unit}
                </span>
                <span className="text-muted">{timeAgo(h.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {goal && (
        <div className="flex flex-wrap gap-2">
          {goal.status === 'completed' || goal.status === 'archived' ? (
            <Button type="button" variant="secondary" size="sm" leadingIcon={<RotateCcw className="size-4" />} onClick={() => setStatus('active', 'Goal reopened')}>
              Reopen
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" leadingIcon={<CheckCircle2 className="size-4" />} onClick={() => setStatus('completed', 'Goal completed')}>
              Mark complete
            </Button>
          )}
          {goal.status !== 'archived' &&
            (confirmArchive ? (
              <Button type="button" variant="danger" size="sm" onClick={() => setStatus('archived', 'Goal archived')}>
                Archive this goal?
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" leadingIcon={<Archive className="size-4" />} onClick={() => setConfirmArchive(true)}>
                Archive
              </Button>
            ))}
        </div>
      )}

      <SheetFooter>
        <Button type="submit" block size="lg" loading={create.isPending || update.isPending}>
          {goal ? 'Save changes' : 'Add goal'}
        </Button>
      </SheetFooter>
    </form>
  );
}
