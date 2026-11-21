import { NavLink } from 'react-router';
import { useState } from 'react';
import { FlaskConical, UserRound } from 'lucide-react';
import { useProfile } from '@/data/hooks/useProfile';
import { ProfileSheet } from '@/features/profile/ProfileSheet';
import { cn } from '@/lib/cn';
import { CyrusMark } from '@/components/brand/CyrusMark';
import { OrbitMark } from '@/components/brand/OrbitMark';
import { useAuth } from '@/app/providers/AuthProvider';
import { NAV_ITEMS } from './navItems';

/** Desktop navigation rail (≥ lg). */
export function SideNav({ className }: { className?: string }) {
  const { status, session } = useAuth();
  const profile = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-[17rem] flex-col border-r border-line bg-canvas/60 px-4 py-8 backdrop-blur-xl',
        className,
      )}
    >
      <div className="px-3">
        <CyrusMark />
        <p className="mt-1 pl-8 text-footnote text-subtle">Personal intelligence system</p>
      </div>

      <nav aria-label="Primary" className="mt-8">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-2.5 rounded-control px-3 text-callout font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.07] text-fg ring-1 ring-white/[0.06] ring-inset'
                      : 'text-muted hover:bg-white/[0.04] hover:text-fg',
                  )
                }
              >
                {item.icon === 'orb' ? <OrbitMark className="size-4.5" /> : <item.icon className="size-4.5" />}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-3">
        {status === 'demo' && (
          <div className="rounded-card border border-warning/20 bg-warning/[0.06] p-4">
            <p className="flex items-center gap-2 text-subhead font-semibold text-warning">
              <FlaskConical className="size-4" /> Demo mode
            </p>
            <p className="mt-1 text-footnote text-muted">Sample data. Changes reset when you reload.</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted">
            <UserRound className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-subhead font-medium">{profile.data?.displayName ?? (status === 'demo' ? 'Demo profile' : session?.user.email)}</span>
            <span className="block text-caption text-subtle">Profile & settings</span>
          </span>
        </button>
      </div>
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </aside>
  );
}
