import { Dumbbell, ListPlus, Receipt, Scale, type LucideIcon } from 'lucide-react';

export type QuickAction = 'weight' | 'workout' | 'expense' | 'task';

const ACTIONS: { id: QuickAction; label: string; icon: LucideIcon }[] = [
  { id: 'weight', label: 'Log weight', icon: Scale },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'expense', label: 'Expense', icon: Receipt },
  { id: 'task', label: 'Add task', icon: ListPlus },
];

export function QuickActions({ onSelect }: { onSelect(action: QuickAction): void }) {
  return (
    <section aria-label="Quick actions">
      <ul className="grid grid-cols-4 gap-2">
        {ACTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelect(id)}
              className="group flex w-full flex-col items-center gap-2 rounded-row py-2 transition active:scale-95"
            >
              <span className="glass flex size-14 items-center justify-center rounded-full text-lilac transition-all duration-300 group-hover:border-secondary/40 group-hover:text-fg group-hover:shadow-glow">
                <Icon className="size-[22px]" strokeWidth={1.9} />
              </span>
              <span className="text-footnote font-medium text-muted transition-colors group-hover:text-fg">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
