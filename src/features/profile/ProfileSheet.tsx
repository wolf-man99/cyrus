import { useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { Sheet, SheetFooter } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { useAuth } from '@/app/providers/AuthProvider';
import { useIsDemo } from '@/app/providers/DataProvider';
import { useProfile } from '@/data/hooks/useProfile';
import { useMutate } from '@/data/hooks/useData';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { fieldErrors, profileUpdateSchema, type ProfileUpdate } from '@/domain/schemas';
import type { Profile } from '@/domain/types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'AED', 'JPY', 'CHF'];

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [Intl.DateTimeFormat().resolvedOptions().timeZone];
  }
}

/** Name, units, currency, timezone and sign-out. */
export function ProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const profile = useProfile();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Profile">
      {profile.data ? <ProfileForm profile={profile.data} onDone={() => onOpenChange(false)} /> : <p className="py-6 text-muted">Loading…</p>}
    </Sheet>
  );
}

function ProfileForm({ profile, onDone }: { profile: Profile; onDone(): void }) {
  const { session, signOut } = useAuth();
  const isDemo = useIsDemo();
  const feedback = useSaveFeedback();
  const save = useMutate((r, patch: ProfileUpdate) => r.profile.update(patch), ['profile']);
  const [name, setName] = useState(profile.displayName ?? '');
  const [weightUnit, setWeightUnit] = useState(profile.weightUnit);
  const [currency, setCurrency] = useState(profile.currency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const zones = timeZones();
  const otherCurrency = !CURRENCIES.includes(currency);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({ displayName: name.trim() || null, weightUnit, currency: currency.toUpperCase(), timezone });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    save.mutate(parsed.data, { onSuccess: () => (feedback.saved('Profile saved'), onDone()), onError: (err) => feedback.failed(err) });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {session?.user.email && (
        <p className="rounded-row border border-line bg-white/[0.03] px-4 py-3 text-subhead">
          <span className="block text-footnote text-muted">Signed in as</span>
          {session.user.email}
        </p>
      )}
      <TextField label="Name" placeholder="What should Cyrus call you?" maxLength={60} value={name} error={errors.displayName} onChange={(e) => setName(e.target.value)} />
      <ChipGroup
        label="Weight unit"
        value={weightUnit}
        onChange={(v) => v && setWeightUnit(v)}
        options={[
          { value: 'kg', label: 'Kilograms' },
          { value: 'lb', label: 'Pounds' },
        ]}
      />
      <div>
        <ChipGroup
          label="Currency"
          value={otherCurrency ? null : currency}
          onChange={(v) => v && setCurrency(v)}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
        <TextField
          className="mt-3"
          label="Other currency code"
          hideLabel
          placeholder="Other (3-letter code)"
          maxLength={3}
          value={otherCurrency ? currency : ''}
          error={errors.currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        />
      </div>
      <div>
        <label htmlFor="profile-tz" className="mb-2 block text-footnote font-medium text-muted">
          Time zone
        </label>
        <select
          id="profile-tz"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="h-13 w-full rounded-control border border-line bg-white/[0.04] px-4 text-body text-fg focus:border-white/30 focus:outline-none"
        >
          {!zones.includes(timezone) && <option value={timezone}>{timezone}</option>}
          {zones.map((z) => (
            <option key={z} value={z} className="bg-surface">
              {z.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      {isDemo ? (
        <p className="text-footnote text-muted">Demo mode: changes last until you reload. Accounts need the backend to be connected.</p>
      ) : (
        <Button type="button" variant="ghost" leadingIcon={<LogOut className="size-4" />} onClick={() => void signOut()}>
          Sign out
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
