import { useState, type FormEvent } from 'react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { AmountInput } from '@/components/ui/AmountInput';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { FieldError, TextField } from '@/components/ui/Field';
import { useLogExpense } from '@/data/hooks/useLogs';
import { useProfile } from '@/data/hooks/useProfile';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { expenseEntrySchema, fieldErrors, parseDecimal } from '@/domain/schemas';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/domain/types';
import { formatCurrency } from '@/lib/format';

export function LogExpenseSheet({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Log expense" description="Amount and a category is all it takes.">
      <ExpenseForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

function currencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function ExpenseForm({ onDone }: { onDone(): void }) {
  const profile = useProfile();
  const logExpense = useLogExpense();
  const feedback = useSaveFeedback();
  const currency = profile.data?.currency ?? 'USD';
  const [raw, setRaw] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = expenseEntrySchema.safeParse({
      amount: parseDecimal(raw),
      category: category ?? undefined,
      note: note.trim() || null,
      currency,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    logExpense.mutate(parsed.data, {
      onSuccess: (tx) => {
        feedback.saved(`${formatCurrency(tx.amount, tx.currency)} · ${tx.category}`);
        onDone();
      },
      onError: (err) => feedback.failed(err),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <AmountInput
        label={`Amount in ${currency}`}
        prefix={currencySymbol(currency)}
        placeholder="0.00"
        value={raw}
        autoFocus
        error={errors.amount}
        onChange={(e) => {
          setRaw(e.target.value);
          setErrors((er) => ({ ...er, amount: '' }));
        }}
      />
      <div>
        <ChipGroup
          label="Category"
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setErrors((er) => ({ ...er, category: '' }));
          }}
        />
        <FieldError message={errors.category} />
      </div>
      <TextField
        label="Note (optional)"
        placeholder="e.g. Lunch with team"
        maxLength={140}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={errors.note}
      />
      <SheetFooter>
        <Button type="submit" block size="lg" loading={logExpense.isPending}>
          Save expense
        </Button>
      </SheetFooter>
    </form>
  );
}
