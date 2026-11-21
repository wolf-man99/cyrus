import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { ScalePicker } from '@/components/ui/ScalePicker';
import { ErrorState } from '@/components/ui/States';
import { useMutate, useReflection } from '@/data/hooks/useData';
import { usePeriodSummary } from '@/data/hooks/usePeriodSummary';
import { useProfile } from '@/data/hooks/useProfile';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { REFLECTION_TEMPLATES, type ReflectionStep, type StepContext } from '@/domain/reflections';
import { reflectionSchema, type ReflectionInput } from '@/domain/schemas';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import type { LifeDomain, ReflectionPeriod } from '@/domain/types';
import type { PeriodSummary } from '@/domain/summary';
import { formatPeriod, periodStart, type ISODate } from '@/lib/dates';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { money } from '@/features/track/domains/types';
import { MOOD_LABELS, ENERGY_LABELS } from '@/features/track/sheets/MoodSheet';

interface Draft {
  responses: Record<string, string>;
  mood: number | null;
  energy: number | null;
  domainRatings: Partial<Record<LifeDomain, number>>;
  goalIds: string[];
}
const EMPTY: Draft = { responses: {}, mood: null, energy: null, domainRatings: {}, goalIds: [] };
const draftKey = (period: string, start: string) => `cyrus.reflect.draft.${period}.${start}`;

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Draft) } : null;
  } catch {
    return null;
  }
}

const isPeriod = (p: string | undefined): p is ReflectionPeriod => p === 'daily' || p === 'weekly' || p === 'monthly';

/** /reflect/:period/:start — write or edit one reflection, one short prompt at a time. */
export function ReflectionFlow() {
  const { period, start } = useParams();
  if (!isPeriod(period) || !start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return <Navigate to="/reflect" replace />;
  const normalised = periodStart(period, start);
  if (normalised !== start) return <Navigate to={`/reflect/${period}/${normalised}`} replace />;
  return <Flow key={`${period}-${start}`} period={period} start={start} />;
}

function Flow({ period, start }: { period: ReflectionPeriod; start: ISODate }) {
  const navigate = useNavigate();
  const template = REFLECTION_TEMPLATES[period];
  const existing = useReflection(period, start);
  const data = usePeriodSummary(period, start);
  const currency = useProfile().data?.currency ?? 'USD';
  const feedback = useSaveFeedback();
  const save = useMutate((r, input: ReflectionInput) => r.reflections.save(input), ['reflections']);
  const key = draftKey(period, start);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [index, setIndex] = useState(0);
  const total = template.steps.length + 1; // + review
  const step = template.steps[index];

  // Start from the saved reflection, or an unsaved draft on this device.
  useEffect(() => {
    if (draft || existing.isPending) return;
    const r = existing.data;
    setDraft(
      readDraft(key) ??
        (r ? { responses: r.responses, mood: r.mood, energy: r.energy, domainRatings: r.domainRatings, goalIds: r.goalIds } : EMPTY),
    );
  }, [draft, existing.isPending, existing.data, key]);

  useEffect(() => {
    if (!draft) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [draft, key]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...(d ?? EMPTY), ...patch }));
  const next = () => setIndex((i) => Math.min(total - 1, i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  const submit = () => {
    if (!draft) return;
    const responses = Object.fromEntries(Object.entries(draft.responses).filter(([, v]) => v.trim()));
    const parsed = reflectionSchema.safeParse({ period, periodStart: start, ...draft, responses });
    if (!parsed.success) return feedback.failed(new Error(parsed.error.issues[0]?.message), 'Check your answers');
    save.mutate(parsed.data, {
      onSuccess: () => {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        feedback.saved(existing.data ? 'Reflection updated' : 'Reflection saved');
        navigate('/reflect');
      },
      onError: (err) => feedback.failed(err),
    });
  };

  if (existing.isError) return <ErrorState title="Couldn’t load this reflection" error={existing.error} onRetry={() => void existing.refetch()} />;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-2xl flex-col">
      <header className="flex items-center gap-3 pt-1">
        <Link to="/reflect" aria-label="Close and keep draft" className="glass inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-fg">
          <X className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-subhead font-semibold">{template.title}</p>
          <p className="truncate text-footnote text-muted">{formatPeriod(period, start)}</p>
        </div>
        <span className="text-footnote text-muted tabular">
          {Math.min(index + 1, total)} / {total}
        </span>
      </header>

      <div className="mt-4 flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= index ? 'bg-primary' : 'bg-white/10')} />
        ))}
      </div>

      <main className="flex-1 pt-8">
        {!draft ? (
          <p className="text-muted">Loading…</p>
        ) : step ? (
          <StepView
            key={step.id}
            step={step}
            draft={draft}
            update={update}
            summary={data.summary}
            goals={data.goals.filter((g) => g.status !== 'archived')}
            currency={currency}
            onSubmitText={next}
          />
        ) : (
          <Review draft={draft} period={period} goals={data.goals} onEdit={setIndex} />
        )}
      </main>

      <footer className="sticky bottom-[calc(var(--nav-height)+max(var(--safe-bottom),0.75rem)+0.75rem)] mt-8 flex items-center gap-2 bg-linear-to-t from-canvas via-canvas to-transparent pt-4 lg:bottom-6">
        {index > 0 && (
          <Button variant="secondary" size="md" onClick={back} leadingIcon={<ArrowLeft className="size-4" />}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step ? (
          <>
            <Button variant="ghost" onClick={next}>
              Skip
            </Button>
            <Button onClick={next}>Next</Button>
          </>
        ) : (
          <Button onClick={submit} loading={save.isPending} leadingIcon={<Check className="size-4" />}>
            {existing.data ? 'Save changes' : 'Save reflection'}
          </Button>
        )}
      </footer>
    </div>
  );
}

interface StepViewProps {
  step: ReflectionStep;
  draft: Draft;
  update(patch: Partial<Draft>): void;
  summary: PeriodSummary | null;
  goals: { id: string; title: string; domain: LifeDomain }[];
  currency: string;
  onSubmitText(): void;
}

function StepView({ step, draft, update, summary, goals, currency, onSubmitText }: StepViewProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);

  return (
    <section aria-labelledby="step-prompt" className="animate-[fade-in_0.3s_var(--ease-out-expo)]">
      <h1 id="step-prompt" className="font-display text-title font-semibold text-balance">
        {step.prompt}
      </h1>

      {step.type === 'text' && (
        <>
          {step.context && summary && <Context kind={step.context} summary={summary} currency={currency} />}
          <TextArea
            ref={ref}
            className="mt-6"
            label={step.prompt}
            hideLabel
            rows={5}
            placeholder={step.placeholder}
            value={draft.responses[step.id] ?? ''}
            onChange={(e) => update({ responses: { ...draft.responses, [step.id]: e.target.value } })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmitText();
            }}
          />
        </>
      )}

      {step.type === 'checkin' && (
        <div className="mt-6 space-y-6">
          <ScalePicker label="Mood" labels={MOOD_LABELS} value={draft.mood} onChange={(mood) => update({ mood })} />
          <ScalePicker label="Energy" labels={ENERGY_LABELS} value={draft.energy} onChange={(energy) => update({ energy })} />
        </div>
      )}

      {step.type === 'domains' && (
        <div className="mt-6 space-y-3">
          <p className="text-subhead text-muted">1 is poor, 5 is excellent. The number on the right is how much you logged.</p>
          {LIFE_DOMAIN_LIST.map((d) => (
            <div key={d.id} className="flex items-center gap-3" role="radiogroup" aria-label={`${d.name} rating`}>
              <span className="flex w-30 shrink-0 items-center gap-2 text-subhead leading-tight">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: d.accent }} />
                <span lang="en" className="min-w-0 hyphens-auto break-words">
                  {d.name}
                </span>
              </span>
              <span className="flex flex-1 gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const selected = draft.domainRatings[d.id] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${n}`}
                      onClick={() => update({ domainRatings: { ...draft.domainRatings, [d.id]: n } })}
                      className={cn(
                        'h-10 min-w-0 flex-1 rounded-control border text-subhead font-medium tabular transition-[background-color,border-color,color]',
                        selected ? 'border-transparent bg-primary text-fg' : 'border-line bg-white/[0.04] text-muted hover:text-fg',
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </span>
              <span className="w-6 shrink-0 text-right text-footnote text-subtle tabular" title="Entries logged">
                {summary?.domains[d.id] ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {step.type === 'goals' && (
        <div className="mt-6">
          {goals.length === 0 ? (
            <p className="text-callout text-muted">No goals yet. You can set them in Track.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Goals">
              {goals.map((g) => {
                const on = draft.goalIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ goalIds: on ? draft.goalIds.filter((x) => x !== g.id) : [...draft.goalIds, g.id] })}
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-subhead font-medium transition-[background-color,border-color,color]',
                      on ? 'border-transparent bg-primary text-fg' : 'border-line bg-white/[0.04] text-muted hover:text-fg',
                    )}
                  >
                    {on && <Check className="size-4" />}
                    {g.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Facts from the period, shown next to a prompt so answers start from what actually happened. */
function Context({ kind, summary, currency }: { kind: StepContext; summary: PeriodSummary; currency: string }) {
  const lines: string[] = [];
  switch (kind) {
    case 'done_tasks':
      lines.push(`${summary.tasks.done} of ${summary.tasks.total} tasks done`);
      break;
    case 'missed_tasks':
      if (summary.tasks.missed.length === 0) lines.push('No missed tasks');
      else lines.push(...summary.tasks.missed.slice(0, 5).map((t) => t.title));
      break;
    case 'habits':
      lines.push(
        ...summary.habits.perHabit
          .filter((h) => h.possible > 0)
          .sort((a, b) => b.rate - a.rate)
          .map((h) => `${h.title}: ${h.done}/${h.possible} days`),
      );
      break;
    case 'health':
      if (summary.weight) lines.push(`Weight ${formatNumber(summary.weight.start)} → ${formatNumber(summary.weight.end)} ${summary.weight.unit}`);
      lines.push(`${summary.workouts.count} workouts, ${summary.workouts.minutes} min`);
      if (summary.energy !== null) lines.push(`Average energy ${formatNumber(summary.energy)}/5`);
      break;
    case 'money':
      lines.push(`Earned ${money(summary.money.earned, currency)} · spent ${money(summary.money.spent, currency)}`);
      if (summary.money.earned > 0) lines.push(`Kept ${formatPercent(Math.max(0, summary.money.net / summary.money.earned))} of income`);
      if (summary.money.topCategories[0]) lines.push(`Biggest category: ${summary.money.topCategories[0].category}`);
      break;
    case 'career':
      lines.push(`${summary.domains.career} career entries logged`);
      break;
    case 'business':
      lines.push(`${summary.domains.entrepreneurship} entrepreneurship entries logged`);
      break;
    case 'goals_progressed':
      if (summary.goalsProgressed.length === 0) lines.push('No goal progress recorded');
      lines.push(...summary.goalsProgressed.map((g) => `${g.title}: ${g.from !== null ? `${formatNumber(g.from)} → ${formatNumber(g.to)}` : `now ${formatNumber(g.to)}`}`));
      break;
    case 'neglected':
      lines.push(summary.neglected.length ? `Quiet areas: ${summary.neglected.map((d) => LIFE_DOMAIN_LIST.find((x) => x.id === d)!.name).join(', ')}` : 'Every area had some activity');
      break;
  }
  if (!lines.length) return null;
  return (
    <aside aria-label="From your records" className="mt-4 rounded-row border border-line bg-surface/60 px-4 py-3">
      <p className="text-footnote font-medium text-subtle">From your records</p>
      <ul className="mt-1 space-y-0.5 text-subhead text-muted">
        {lines.slice(0, 6).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </aside>
  );
}

function Review({
  draft,
  period,
  goals,
  onEdit,
}: {
  draft: Draft;
  period: ReflectionPeriod;
  goals: { id: string; title: string }[];
  onEdit(index: number): void;
}) {
  const steps = REFLECTION_TEMPLATES[period].steps;
  const answered = steps.filter(
    (s) =>
      (s.type === 'text' && draft.responses[s.id]?.trim()) ||
      (s.type === 'checkin' && (draft.mood || draft.energy)) ||
      (s.type === 'domains' && Object.keys(draft.domainRatings).length) ||
      (s.type === 'goals' && draft.goalIds.length),
  );
  const ratingText = useMemo(
    () =>
      LIFE_DOMAIN_LIST.filter((d) => draft.domainRatings[d.id])
        .map((d) => `${d.name} ${draft.domainRatings[d.id]}`)
        .join(' · '),
    [draft.domainRatings],
  );
  return (
    <section aria-labelledby="review-heading">
      <h1 id="review-heading" className="font-display text-title font-semibold">
        {answered.length ? 'Looks good?' : 'Nothing written yet'}
      </h1>
      <p className="mt-1 text-subhead text-muted">
        {answered.length ? `You answered ${answered.length} of ${steps.length}. Tap one to change it.` : 'Go back and answer at least one prompt, or save it empty.'}
      </p>
      <ul className="mt-6 space-y-2">
        {answered.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onEdit(steps.indexOf(s))} className="w-full rounded-row border border-line bg-surface/75 px-4 py-3 text-left transition-colors hover:bg-surface">
              <span className="block text-footnote text-muted">{s.prompt}</span>
              <span className="mt-0.5 block text-callout">
                {s.type === 'text' && draft.responses[s.id]}
                {s.type === 'checkin' && [draft.mood && `Mood ${MOOD_LABELS[draft.mood - 1]}`, draft.energy && `Energy ${ENERGY_LABELS[draft.energy - 1]}`].filter(Boolean).join(' · ')}
                {s.type === 'domains' && ratingText}
                {s.type === 'goals' && goals.filter((g) => draft.goalIds.includes(g.id)).map((g) => g.title).join(', ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
