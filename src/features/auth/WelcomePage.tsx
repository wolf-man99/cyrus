import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { LIFE_DOMAIN_LIST } from '@/domain/lifeDomains';
import { CyrusMark } from '@/components/brand/CyrusMark';
import { useAuth } from '@/app/providers/AuthProvider';

const emailSchema = z.email({ error: 'Enter a valid email address' });

/** Sign-in (Orbit welcome-screen inspired): the seven life domains orbit the planet. */
export function WelcomePage() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSending(true);
    try {
      await signInWithEmail(parsed.data);
      setSentTo(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center px-6 pt-safe pb-safe">
      <div className="cosmos" aria-hidden />
      <DomainOrbit />

      <div className="relative w-full max-w-sm pb-6 text-center">
        <CyrusMark className="justify-center" />
        <h1 className="mt-4 font-display text-title font-semibold">Your personal intelligence system</h1>
        <p className="mt-3 text-callout text-muted">
          Plan your day, track seven areas of life and reflect on how it’s going, with an assistant at your side.
        </p>

        {sentTo ? (
          <div className="mt-8 rounded-card border border-line bg-surface/70 p-5" role="status">
            <MailCheck className="mx-auto size-8 text-secondary" />
            <p className="mt-3 text-headline font-semibold">Check your inbox</p>
            <p className="mt-1 text-subhead text-muted">
              We sent a sign-in link to <span className="text-fg">{sentTo}</span>.
            </p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSentTo(null)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-8 space-y-4 text-left">
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              error={error}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(undefined);
              }}
            />
            <Button type="submit" block size="lg" loading={sending}>
              Email me a sign-in link
            </Button>
            <p className="text-center text-footnote text-subtle">Passwordless sign-in. Your data is private to you.</p>
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
    <div aria-hidden className="relative my-auto aspect-square w-[min(74vw,40dvh,22rem)] shrink-0">
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
      <div
        className="absolute rounded-full border border-white/[0.07]"
        style={{ inset: `${50 - radius}%` }}
      />
      {items.map((d, i) => {
        const angle = (i / items.length) * 2 * Math.PI + (reverse ? 0.6 : -0.4);
        const Icon = d.icon;
        return (
          <div
            key={d.id}
            className="absolute size-11 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%` }}
          >
            <div className="glass flex size-full items-center justify-center rounded-full text-muted">
              <Icon className="size-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
