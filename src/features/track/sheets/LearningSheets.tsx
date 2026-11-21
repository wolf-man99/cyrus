import { useState, type FormEvent } from 'react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/Field';
import { useLearning, useMutate } from '@/data/hooks/useData';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, learningResourceSchema, parseDecimal, type LearningResourceInput } from '@/domain/schemas';
import type { LearningKind, LearningResource, LearningStatus, LearningUnit } from '@/domain/types';
import type { Repository } from '@/data/repository';
import { formatNumber } from '@/lib/format';

const KIND_OPTIONS: { value: LearningKind; label: string }[] = [
  { value: 'book', label: 'Book' },
  { value: 'course', label: 'Course' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'podcast', label: 'Podcast' },
];
const DEFAULT_UNIT: Record<LearningKind, LearningUnit> = { book: 'pages', course: 'lessons', article: 'percent', video: 'hours', podcast: 'hours' };

/** Add or edit a book, course or other learning resource. */
export function LearningResourceSheet({
  open,
  onOpenChange,
  resource,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  resource?: LearningResource | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={resource ? resource.title : 'Add to your learning'}>
      <ResourceForm resource={resource ?? null} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function ResourceForm({ resource, onDone }: { resource: LearningResource | null; onDone(): void }) {
  const feedback = useSaveFeedback();
  const save = useMutate(
    (r, input: LearningResourceInput) => (resource ? r.learning.update(resource.id, input) : r.learning.create(input)),
    ['learning'],
  );
  const [kind, setKind] = useState<LearningKind>(resource?.kind ?? 'book');
  const [title, setTitle] = useState(resource?.title ?? '');
  const [author, setAuthor] = useState(resource?.author ?? '');
  const [status, setStatus] = useState<LearningStatus>(resource?.status ?? 'active');
  const [progress, setProgress] = useState(String(resource?.progress ?? 0));
  const [total, setTotal] = useState(resource?.total ? String(resource.total) : '');
  const [rating, setRating] = useState<number | null>(resource?.rating ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const unit = resource?.unit ?? DEFAULT_UNIT[kind];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = learningResourceSchema.safeParse({
      kind,
      title,
      author: author.trim() || null,
      status,
      progress: progress.trim() ? parseDecimal(progress) : 0,
      total: total.trim() ? parseDecimal(total) : null,
      unit,
      rating,
      notes: resource?.notes ?? null,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    save.mutate(parsed.data, { onSuccess: () => (feedback.saved(resource ? 'Updated' : 'Added'), onDone()), onError: (err) => feedback.failed(err) });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {!resource && <ChipGroup label="Type" value={kind} onChange={(v) => v && setKind(v)} options={KIND_OPTIONS} />}
      <TextField label="Title" autoFocus={!resource} maxLength={160} value={title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label={kind === 'course' ? 'Platform or teacher (optional)' : 'Author (optional)'} maxLength={120} value={author} onChange={(e) => setAuthor(e.target.value)} />
      <ChipGroup
        label="Status"
        value={status}
        onChange={(v) => v && setStatus(v)}
        options={[
          { value: 'planned', label: 'Planned' },
          { value: 'active', label: 'In progress' },
          { value: 'paused', label: 'Paused' },
          { value: 'completed', label: 'Finished' },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={`Progress (${unit})`} inputMode="decimal" value={progress} error={errors.progress} onChange={(e) => setProgress(e.target.value)} />
        <TextField label={`Total (${unit})`} inputMode="decimal" placeholder="Optional" value={total} onChange={(e) => setTotal(e.target.value)} />
      </div>
      {status === 'completed' && (
        <ChipGroup label="Rating (optional)" allowDeselect value={rating} onChange={setRating} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}★` }))} />
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          {resource ? 'Save changes' : 'Add'}
        </Button>
      </SheetFooter>
    </form>
  );
}

/**
 * Logs reading or course progress: moves the resource forward and records the session,
 * finishing the resource when it reaches its total. Shared with the assistant.
 */
export async function logLearningProgress(repo: Repository, resource: LearningResource, amount: number) {
  const next = resource.total ? Math.min(resource.total, resource.progress + amount) : resource.progress + amount;
  const finished = resource.total !== null && next >= resource.total;
  const updated = await repo.learning.update(resource.id, {
    progress: next,
    ...(finished ? { status: 'completed' as const } : resource.status === 'planned' ? { status: 'active' as const } : {}),
  });
  await repo.activities.create({
    domain: 'intellectual',
    kind: resource.kind === 'book' || resource.kind === 'article' ? 'reading' : 'course',
    title: resource.title,
    value: next - resource.progress,
    unit: resource.unit,
    notes: null,
    details: { resourceId: resource.id },
    goalId: null,
  });
  return { updated, finished };
}

/** Quick progress logging for anything in progress. */
export function LogProgressSheet({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log learning">
      <ProgressForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function ProgressForm({ onDone }: { onDone(): void }) {
  const feedback = useSaveFeedback();
  const learning = useLearning();
  const active = learning.data?.filter((r) => r.status === 'active') ?? [];
  const [id, setId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string>();
  const selected = active.find((r) => r.id === (id ?? active[0]?.id));
  const save = useMutate((r, v: { resource: LearningResource; amount: number }) => logLearningProgress(r, v.resource, v.amount), ['learning', 'activities']);
  const presets = selected?.unit === 'pages' ? [10, 20, 30, 50] : [1, 2, 3];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseDecimal(amount);
    if (!selected) return setError('Add something to read or learn first');
    if (!Number.isFinite(n) || n <= 0) return setError(`Enter ${selected.unit} done`);
    save.mutate(
      { resource: selected, amount: n },
      {
        onSuccess: ({ finished }) => (feedback.saved(finished ? `Finished “${selected.title}”` : 'Progress logged'), onDone()),
        onError: (err) => feedback.failed(err),
      },
    );
  };

  if (learning.isPending) return <p className="py-6 text-muted">Loading…</p>;
  if (active.length === 0) return <p className="py-6 text-callout text-muted">Nothing in progress. Add a book or course first.</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <ChipGroup label="What did you work on?" value={selected?.id ?? null} onChange={(v) => v && setId(v)} options={active.map((r) => ({ value: r.id, label: r.title }))} />
      {selected && (
        <>
          <ChipGroup
            label={`${selected.unit[0]!.toUpperCase()}${selected.unit.slice(1)} done`}
            value={presets.includes(Number(amount)) ? Number(amount) : null}
            onChange={(v) => v !== null && (setAmount(String(v)), setError(undefined))}
            options={presets.map((p) => ({ value: p, label: String(p) }))}
          />
          <TextField label="Custom amount" hideLabel placeholder="Custom" inputMode="decimal" value={amount} error={error} onChange={(e) => (setAmount(e.target.value), setError(undefined))} />
          <p className="px-1 text-footnote text-muted tabular">
            Now at {formatNumber(selected.progress)}
            {selected.total ? ` of ${formatNumber(selected.total)}` : ''} {selected.unit}
          </p>
        </>
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          Log progress
        </Button>
      </SheetFooter>
    </form>
  );
}
