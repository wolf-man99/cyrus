import { useState, type FormEvent } from 'react';
import { Archive } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TextField } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { useMutate } from '@/data/hooks/useData';
import { useProfile } from '@/data/hooks/useProfile';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import {
  fieldErrors,
  incomeEntrySchema,
  investmentSchema,
  parseDecimal,
  projectSchema,
  skillSchema,
  type IncomeEntry,
  type InvestmentInput,
  type ProjectInput,
  type SkillInput,
} from '@/domain/schemas';
import {
  INCOME_SOURCES,
  INVESTMENT_KINDS,
  type Investment,
  type Project,
  type ProjectDomain,
  type ProjectKind,
  type ProjectStatus,
  type Skill,
  type SkillDomain,
} from '@/domain/types';
import { AmountInput } from '@/components/ui/AmountInput';

const levelOptions = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
export const LEVEL_LABELS = ['Beginner', 'Basic', 'Capable', 'Strong', 'Expert'];

/* ───────────── Skills ───────────── */

export function SkillSheet({ open, onOpenChange, domain, skill }: { open: boolean; onOpenChange(o: boolean): void; domain: SkillDomain; skill?: Skill | null }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={skill ? skill.name : 'Add a skill'}>
      <SkillForm domain={domain} skill={skill ?? null} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function SkillForm({ domain, skill, onDone }: { domain: SkillDomain; skill: Skill | null; onDone(): void }) {
  const feedback = useSaveFeedback();
  const save = useMutate((r, input: SkillInput) => (skill ? r.skills.update(skill.id, input) : r.skills.create(input)), ['skills']);
  const archive = useMutate((r, id: string) => r.skills.archive(id), ['skills']);
  const [name, setName] = useState(skill?.name ?? '');
  const [level, setLevel] = useState<number>(skill?.level ?? 1);
  const [target, setTarget] = useState<number | null>(skill?.targetLevel ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = skillSchema.safeParse({ domain, name, level, targetLevel: target, notes: skill?.notes ?? null });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    save.mutate(parsed.data, { onSuccess: () => (feedback.saved('Skill saved'), onDone()), onError: (err) => feedback.failed(err) });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <TextField label="Skill" placeholder="e.g. SQL, Spanish, Negotiation" autoFocus={!skill} maxLength={80} value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
      <ChipGroup label={`Current level · ${LEVEL_LABELS[level - 1]}`} value={level} onChange={(v) => v && setLevel(v)} options={levelOptions} />
      <ChipGroup label={`Target level${target ? ` · ${LEVEL_LABELS[target - 1]}` : ' (optional)'}`} allowDeselect value={target} onChange={setTarget} options={levelOptions} />
      {skill && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leadingIcon={<Archive className="size-4" />}
          onClick={() => archive.mutate(skill.id, { onSuccess: () => (feedback.saved('Skill archived'), onDone()), onError: (err) => feedback.failed(err) })}
        >
          Archive skill
        </Button>
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          {skill ? 'Save changes' : 'Add skill'}
        </Button>
      </SheetFooter>
    </form>
  );
}

/* ───────────── Projects, ideas, ventures, experiments ───────────── */

const KIND_LABEL: Record<ProjectKind, string> = { project: 'Project', idea: 'Idea', venture: 'Venture', experiment: 'Experiment' };

export function ProjectSheet({
  open,
  onOpenChange,
  domain,
  kind,
  project,
}: {
  open: boolean;
  onOpenChange(o: boolean): void;
  domain: ProjectDomain;
  kind: ProjectKind;
  project?: Project | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={project ? project.title : `New ${KIND_LABEL[kind].toLowerCase()}`}>
      <ProjectForm domain={domain} kind={project?.kind ?? kind} project={project ?? null} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function ProjectForm({ domain, kind, project, onDone }: { domain: ProjectDomain; kind: ProjectKind; project: Project | null; onDone(): void }) {
  const feedback = useSaveFeedback();
  const save = useMutate((r, input: ProjectInput) => (project ? r.projects.update(project.id, input) : r.projects.create(input)), ['projects']);
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? (kind === 'idea' ? 'idea' : 'active'));
  const [hypothesis, setHypothesis] = useState(project?.hypothesis ?? '');
  const [outcome, setOutcome] = useState(project?.outcome ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const statuses: { value: ProjectStatus; label: string }[] =
    kind === 'idea'
      ? [
          { value: 'idea', label: 'Idea' },
          { value: 'active', label: 'Pursuing' },
          { value: 'dropped', label: 'Dropped' },
        ]
      : [
          { value: 'active', label: kind === 'experiment' ? 'Running' : 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'completed', label: kind === 'experiment' ? 'Concluded' : 'Done' },
          { value: 'dropped', label: 'Dropped' },
        ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = projectSchema.safeParse({
      domain,
      kind: kind === 'idea' && status === 'active' ? 'venture' : kind,
      title,
      description: description.trim() || null,
      status,
      hypothesis: hypothesis.trim() || null,
      outcome: outcome.trim() || null,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    save.mutate(parsed.data, { onSuccess: () => (feedback.saved(`${KIND_LABEL[parsed.data.kind]} saved`), onDone()), onError: (err) => feedback.failed(err) });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <TextField label="Name" autoFocus={!project} maxLength={120} value={title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
      {kind === 'experiment' ? (
        <>
          <TextArea label="Hypothesis" rows={2} placeholder="If we…, then… (measured by…)" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
          {(project || status === 'completed') && (
            <TextArea label="Result" rows={2} placeholder="What actually happened?" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          )}
        </>
      ) : (
        <TextArea label="Description (optional)" rows={2} placeholder="One or two lines" value={description} onChange={(e) => setDescription(e.target.value)} />
      )}
      <ChipGroup label="Status" value={status} onChange={(v) => v && setStatus(v)} options={statuses} />
      {kind === 'idea' && status === 'active' && <p className="px-1 text-footnote text-muted">Pursuing an idea turns it into a venture</p>}
      {kind !== 'experiment' && project && status === 'completed' && (
        <TextArea label="Outcome (optional)" rows={2} placeholder="What came of it?" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          {project ? 'Save changes' : 'Add'}
        </Button>
      </SheetFooter>
    </form>
  );
}

/* ───────────── Investments ───────────── */

export function InvestmentSheet({ open, onOpenChange, investment }: { open: boolean; onOpenChange(o: boolean): void; investment?: Investment | null }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={investment ? investment.name : 'Add investment'} description={investment ? 'Update its current value' : undefined}>
      <InvestmentForm investment={investment ?? null} onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function InvestmentForm({ investment, onDone }: { investment: Investment | null; onDone(): void }) {
  const feedback = useSaveFeedback();
  const currency = useProfile().data?.currency ?? 'USD';
  const save = useMutate(
    (r, input: InvestmentInput) => (investment ? r.investments.update(investment.id, input) : r.investments.create(input)),
    ['investments'],
  );
  const archive = useMutate((r, id: string) => r.investments.archive(id), ['investments']);
  const [name, setName] = useState(investment?.name ?? '');
  const [kind, setKind] = useState<Investment['kind']>(investment?.kind ?? 'funds');
  const [invested, setInvested] = useState(investment ? String(investment.investedAmount) : '');
  const [value, setValue] = useState(investment ? String(investment.currentValue) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = investmentSchema.safeParse({
      name,
      kind,
      investedAmount: invested.trim() ? parseDecimal(invested) : 0,
      currentValue: parseDecimal(value),
      currency: investment?.currency ?? currency,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    save.mutate(parsed.data, { onSuccess: () => (feedback.saved(investment ? 'Value updated' : 'Investment added'), onDone()), onError: (err) => feedback.failed(err) });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {investment ? (
        <AmountInput label="Current value" suffix={investment.currency} autoFocus value={value} error={errors.currentValue} onChange={(e) => setValue(e.target.value)} />
      ) : (
        <>
          <TextField label="Name" placeholder="e.g. Global index fund" autoFocus maxLength={80} value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
          <ChipGroup label="Type" value={kind} onChange={(v) => v && setKind(v)} options={INVESTMENT_KINDS.map((k) => ({ value: k, label: k[0]!.toUpperCase() + k.slice(1) }))} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label={`Amount invested (${currency})`} inputMode="decimal" value={invested} onChange={(e) => setInvested(e.target.value)} />
            <TextField label={`Current value (${currency})`} inputMode="decimal" value={value} error={errors.currentValue} onChange={(e) => setValue(e.target.value)} />
          </div>
        </>
      )}
      {investment && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leadingIcon={<Archive className="size-4" />}
          onClick={() => archive.mutate(investment.id, { onSuccess: () => (feedback.saved('Investment archived'), onDone()), onError: (err) => feedback.failed(err) })}
        >
          Sold or closed? Archive it
        </Button>
      )}
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          Save
        </Button>
      </SheetFooter>
    </form>
  );
}

/* ───────────── Income ───────────── */

export function IncomeSheet({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log income">
      <IncomeForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function IncomeForm({ onDone }: { onDone(): void }) {
  const feedback = useSaveFeedback();
  const currency = useProfile().data?.currency ?? 'USD';
  const save = useMutate((r, input: IncomeEntry) => r.income.create(input), ['income']);
  const [raw, setRaw] = useState('');
  const [source, setSource] = useState<string | null>('Salary');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = incomeEntrySchema.safeParse({ amount: parseDecimal(raw), source: source ?? '', note: note.trim() || null, currency });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    save.mutate(parsed.data, { onSuccess: () => (feedback.saved('Income logged'), onDone()), onError: (err) => feedback.failed(err) });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <AmountInput label={`Amount in ${currency}`} suffix={currency} autoFocus placeholder="0.00" value={raw} error={errors.amount} onChange={(e) => setRaw(e.target.value)} />
      <ChipGroup label="Source" value={source} onChange={setSource} options={INCOME_SOURCES.map((s) => ({ value: s, label: s }))} />
      <TextField label="Note (optional)" maxLength={140} placeholder="e.g. Client workshop" value={note} onChange={(e) => setNote(e.target.value)} />
      <SheetFooter>
        <Button type="submit" block size="lg" loading={save.isPending}>
          Save income
        </Button>
      </SheetFooter>
    </form>
  );
}
