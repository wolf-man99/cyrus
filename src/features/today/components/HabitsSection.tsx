import { Flame, Plus, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { tap } from '@/lib/haptics';
import type { HabitWithState } from '@/domain/habits';
import { LIFE_DOMAIN_CONFIG } from '@/domain/lifeDomains';
import { HABIT_ICON_COMPONENTS } from '@/components/habitIcons';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';

interface HabitsSectionProps {
  habits: HabitWithState[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry(): void;
  onToggle(habit: HabitWithState): void;
  onManage(): void;
}

export function HabitsSection({ habits, isPending, error, onRetry, onToggle, onManage }: HabitsSectionProps) {
  const done = habits?.filter((h) => h.doneToday).length ?? 0;
  return (
    <section aria-labelledby="habits-heading">
      <SectionHeader
        id="habits-heading"
        title="Habits"
        meta={habits && habits.length > 0 ? `${done} of ${habits.length}` : undefined}
        action={
          habits && habits.length > 0 ? (
            <button type="button" onClick={onManage} className="rounded-full px-2 py-1 font-medium text-secondary hover:text-lilac">
              Edit
            </button>
          ) : undefined
        }
      />
      <div className="mt-2">
        {isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 py-2">
                <div className="size-16 animate-shimmer rounded-full bg-white/[0.06]" />
                <div className="h-2.5 w-14 animate-shimmer rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState title="Couldn’t load your habits" error={error} onRetry={onRetry} />
        ) : habits && habits.length > 0 ? (
          <ul className="grid grid-cols-3 gap-x-2 gap-y-1 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
            {habits.map((h) => (
              <li key={h.id}>
                <HabitTile habit={h} onToggle={onToggle} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<Repeat className="size-5" />}
            title="Build your first habit"
            description="Small daily actions, one tap to complete."
            action={
              <Button size="sm" variant="secondary" leadingIcon={<Plus className="size-4" />} onClick={onManage}>
                Add habit
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}

function HabitTile({ habit, onToggle }: { habit: HabitWithState; onToggle(h: HabitWithState): void }) {
  const Icon = HABIT_ICON_COMPONENTS[habit.icon];
  const accent = habit.domain ? LIFE_DOMAIN_CONFIG[habit.domain].accent : 'var(--color-secondary)';
  return (
    <button
      type="button"
      aria-pressed={habit.doneToday}
      aria-label={`${habit.title}${habit.streak > 0 ? `, ${habit.streak}-day streak` : ''}`}
      onClick={() => {
        tap();
        onToggle(habit);
      }}
      className="group flex w-full flex-col items-center gap-2 rounded-row px-1 py-2"
    >
      <motion.span
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className={cn(
          'relative flex size-16 items-center justify-center rounded-full transition-all duration-500',
          habit.doneToday
            ? 'bg-aurora text-fg shadow-[0_0_28px_-4px_rgb(180_76_255/0.85)]'
            : 'border border-line bg-surface/80 group-hover:border-white/20',
        )}
        style={habit.doneToday ? undefined : { color: accent }}
      >
        <Icon className="size-6" strokeWidth={1.9} />
        {habit.doneToday && (
          <motion.span
            aria-hidden
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border-2 border-secondary"
          />
        )}
      </motion.span>
      <span className={cn('line-clamp-2 text-center text-footnote leading-tight font-medium', habit.doneToday ? 'text-fg' : 'text-muted')}>
        {habit.title}
      </span>
      <span
        className={cn(
          'flex h-4 items-center gap-0.5 text-caption tabular',
          habit.streak > 0 ? 'text-warning' : 'text-transparent',
        )}
        aria-hidden
      >
        <Flame className="size-3" />
        {habit.streak}
      </span>
    </button>
  );
}
