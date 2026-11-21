import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CyrusMark } from '@/components/brand/CyrusMark';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import { useAuth } from '@/app/providers/AuthProvider';
import { PasswordField } from './PasswordField';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

const email = z.email({ error: 'Enter a valid email address' });
const password = z.string().min(8, { error: 'Use at least 8 characters' }).max(72, { error: 'Use at most 72 characters' });

/** Sign in, create an account, or recover a password. The seven domains orbit the planet. */
export function WelcomePage() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ title: string; body: string } | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: '', form: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const em = email.safeParse(form.email.trim());
    if (!em.success) errs.email = em.error.issues[0]!.message;
    if (mode !== 'forgot') {
      const pw = password.safeParse(form.password);
      if (!pw.success) errs.password = pw.error.issues[0]!.message;
    }
    if (Object.keys(errs).length) return setErrors(errs);

    setBusy(true);
    try {
      if (mode === 'sign-in') await auth.signIn(form.email.trim(), form.password);
      if (mode === 'sign-up') {
        const { signedIn } = await auth.signUp(form.email.trim(), form.password, form.name.trim() || null);
        if (!signedIn) setSent({ title: 'Confirm your email', body: `We sent a confirmation link to ${form.email.trim()}. Open it to finish creating your account.` });
      }
      if (mode === 'forgot') {
        await auth.sendPasswordReset(form.email.trim());
        setSent({ title: 'Check your inbox', body: `If an account exists for ${form.email.trim()}, a link to reset your password is on its way.` });
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center px-6 pt-safe pb-safe">
      <div className="cosmos" aria-hidden />
      <DomainOrbit />

      <div className="relative w-full max-w-sm pb-6">
        <div className="text-center">
          <CyrusMark className="justify-center" />
          <h1 className="mt-4 font-display text-title font-semibold">Your personal intelligence system</h1>
          <p className="mt-2 text-callout text-muted">Plan your day, track seven areas of life and reflect on how it’s going, with an assistant at your side.</p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-card border border-line bg-surface/70 p-5 text-center" role="status">
            <MailCheck className="mx-auto size-8 text-secondary" />
            <p className="mt-3 text-headline font-semibold">{sent.title}</p>
            <p className="mt-1 text-subhead text-muted">{sent.body}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSent(null);
                setMode('sign-in');
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            {mode !== 'forgot' && (
              <SegmentedControl
                label="Account"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setErrors({});
                }}
                options={[
                  { value: 'sign-in', label: 'Sign in' },
                  { value: 'sign-up', label: 'Create account' },
                ]}
              />
            )}
            {mode === 'forgot' && <p className="text-callout text-muted">Enter your email and we’ll send you a link to choose a new password.</p>}
            {mode === 'sign-up' && <TextField label="Name (optional)" autoComplete="given-name" maxLength={60} value={form.name} onChange={set('name')} />}
            <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} error={errors.email} onChange={set('email')} />
            {mode !== 'forgot' && (
              <PasswordField
                label="Password"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                value={form.password}
                error={errors.password}
                hint={mode === 'sign-up' ? 'At least 8 characters' : undefined}
                onChange={set('password')}
              />
            )}
            {errors.form && (
              <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-subhead text-danger">
                {errors.form}
              </p>
            )}
            <Button type="submit" block size="lg" loading={busy}>
              {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
            </Button>
            <div className="text-center">
              {mode === 'sign-in' && (
                <button type="button" className="text-subhead text-muted hover:text-fg" onClick={() => setMode('forgot')}>
                  Forgot your password?
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" className="text-subhead text-muted hover:text-fg" onClick={() => setMode('sign-in')}>
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DomainOrbit() {
  const inner = LIFE_DOMAIN_LIST.slice(0, 3);
  const outer = LIFE_DOMAIN_LIST.slice(3);
  return (
    <div aria-hidden className="relative my-auto aspect-square w-[min(66vw,34dvh,20rem)] shrink-0">
      <Ring items={outer} radius={43} />
      <Ring items={inner} radius={26} reverse />
      <div className="absolute inset-[38%] flex items-center justify-center">
        <div className="planet-sphere size-full rounded-full" />
      </div>
    </div>
  );
}

/** The seven domains placed on two still orbits around the planet. */
function Ring({ items, radius, reverse }: { items: typeof LIFE_DOMAIN_LIST; radius: number; reverse?: boolean }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute rounded-full border border-white/[0.07]" style={{ inset: `${50 - radius}%` }} />
      {items.map((d, i) => {
        const angle = (i / items.length) * 2 * Math.PI + (reverse ? 0.6 : -0.4);
        const Icon = d.icon;
        return (
          <div
            key={d.id}
            className="absolute size-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%` }}
          >
            <div className="glass flex size-full items-center justify-center rounded-full text-muted">
              <Icon className="size-4.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
