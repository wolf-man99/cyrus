import { useRef, useState, type FormEvent } from 'react';
import { FileUp } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useMutate } from '@/data/hooks/useData';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { checkReportFile, fieldErrors, healthReportSchema, type HealthReportInput } from '@/domain/schemas';
import { cn } from '@/lib/cn';

/** Upload a health report (PDF or image) to private storage. */
export function HealthReportSheet({ open, onOpenChange }: { open: boolean; onOpenChange(o: boolean): void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Upload health report" description="Stored privately. Only you can open it.">
      <ReportForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}

const bytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function ReportForm({ onDone }: { onDone(): void }) {
  const feedback = useSaveFeedback();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const upload = useMutate((r, v: { file: File; meta: HealthReportInput }) => r.healthReports.upload(v.file, v.meta), ['health-reports']);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const problem = checkReportFile(f);
    setErrors((e) => ({ ...e, file: problem ?? '' }));
    setFile(problem ? null : f);
    if (!problem && !title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setErrors((er) => ({ ...er, file: 'Choose a file' }));
    const parsed = healthReportSchema.safeParse({ title, reportDate: date || null, notes: null });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    upload.mutate({ file, meta: parsed.data }, { onSuccess: () => (feedback.saved('Report uploaded'), onDone()), onError: (err) => feedback.failed(err, 'Upload failed') });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <input
          ref={input}
          id="report-file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <label
          htmlFor="report-file"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed px-6 py-8 text-center transition-colors hover:bg-white/[0.03]',
            errors.file ? 'border-danger/60' : 'border-white/15',
          )}
        >
          <FileUp className="size-6 text-secondary" />
          {file ? (
            <span className="text-callout font-medium">
              {file.name} <span className="text-muted">· {bytes(file.size)}</span>
            </span>
          ) : (
            <span className="text-callout font-medium">Choose a PDF or photo</span>
          )}
          <span className="text-footnote text-muted">Up to 20 MB</span>
        </label>
        {errors.file && (
          <p role="alert" className="mt-1.5 px-1 text-footnote text-danger">
            {errors.file}
          </p>
        )}
      </div>
      <TextField label="Title" maxLength={120} placeholder="e.g. Annual blood panel" value={title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label="Report date (optional)" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <SheetFooter>
        <Button type="submit" block size="lg" loading={upload.isPending}>
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </SheetFooter>
    </form>
  );
}
