import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { OrbitMark } from '@/components/brand/OrbitMark';
import { NAV_ITEMS } from './navItems';

/** Floating glass tab bar for phones and tablets. */
export function BottomNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(var(--safe-bottom),0.75rem)]',
        // Fade content out beneath the bar (a tone shift within the canvas, not a hue gradient)
        'before:pointer-events-none before:absolute before:inset-x-0 before:-top-10 before:bottom-0 before:bg-linear-to-t before:from-canvas before:via-canvas/80 before:to-transparent',
        className,
      )}
    >
      <ul className="glass relative mx-auto flex h-[var(--nav-height)] max-w-md items-stretch rounded-full px-1.5 shadow-float">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-caption font-medium transition-colors',
                  isActive ? 'text-fg' : 'text-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-white/[0.1]',
                    )}
                  >
                    {item.icon === 'orb' ? <OrbitMark className="size-5" /> : <item.icon className="size-5" />}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
