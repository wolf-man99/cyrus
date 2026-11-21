import { NavLink } from 'react-router';
import { FlaskConical, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CyrusMark } from '@/components/brand/CyrusMark';
import { MiniOrb } from '@/components/brand/MiniOrb';
import { useAuth } from '@/app/providers/AuthProvider';
import { NAV_ITEMS } from './navItems';

/** Desktop navigation rail (≥ lg). */
export function SideNav({ className }: { className?: string }) {
  const { status, session, signOut } = useAuth();
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-[17rem] flex-col border-r border-line bg-canvas/40 px-5 py-7 backdrop-blur-xl',
        className,
      )}
    >
      <div className="px-3">
        <CyrusMark />
        <p className="mt-1.5 pl-[2.375rem] text-caption text-subtle">Personal Intelligence System</p>
      </div>

      <nav aria-label="Primary" className="mt-10">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-12 items-center gap-3.5 rounded-full px-4 text-callout font-medium transition-all',
                    isActive
                      ? 'bg-primary/90 text-fg shadow-[0_0_26px_-8px_rgb(180_76_255/0.9)]'
                      : 'text-muted hover:bg-white/[0.05] hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon === 'orb' ? (
                      <MiniOrb className="size-6" active={isActive} />
                    ) : (
                      <item.icon className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                    )}
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto">
        {status === 'demo' ? (
          <div className="rounded-card border border-warning/20 bg-warning/[0.06] p-4">
            <p className="flex items-center gap-2 text-subhead font-semibold text-warning">
              <FlaskConical className="size-4" /> Demo mode
            </p>
            <p className="mt-1 text-footnote text-muted">Sample data. Changes reset when you reload.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-card px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-subhead font-medium">{session?.user.email}</p>
              <p className="text-caption text-subtle">Synced securely</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-white/[0.06] hover:text-fg"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
