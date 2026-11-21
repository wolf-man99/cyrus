import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useProfile } from '@/data/hooks/useProfile';
import { ProfileSheet } from './ProfileSheet';

/** Round avatar button that opens the profile sheet. */
export function AccountButton() {
  const [open, setOpen] = useState(false);
  const name = useProfile().data?.displayName;
  const initials = name
    ?.split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Profile and settings"
        className="glass inline-flex size-11 items-center justify-center rounded-full text-subhead font-semibold text-fg transition-colors hover:bg-white/[0.1]"
      >
        {initials || <UserRound className="size-5" />}
      </button>
      <ProfileSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
