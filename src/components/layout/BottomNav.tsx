import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { MiniOrb } from '@/components/brand/MiniOrb';
import { NAV_ITEMS } from './navItems';

/** Floating glass tab bar for phones and tablets. */
export function BottomNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(var(--safe-bottom),0.75rem)]',
        // Fade content out beneath the bar
        'before:pointer-events-none before:absolute before:inset-x-0 before:-top-10 before:bottom-0 before:bg-gradient-to-t before:from-canvas before:via-canvas/80 before:to-transparent',
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
                  'group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full text-caption font-medium transition-colors',
                  isActive ? 'text-fg' : 'text-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300',
                      isActive && item.icon !== 'orb' && 'bg-primary/90 shadow-[0_0_22px_-4px_rgb(180_76_255/0.9)]',
                    )}
                  >
                    {item.icon === 'orb' ? (
                      <MiniOrb active={isActive} className={cn('transition-transform', isActive ? 'size-7' : 'size-6')} />
                    ) : (
                      <item.icon className="size-[21px]" strokeWidth={isActive ? 2.2 : 1.8} />
                    )}
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
