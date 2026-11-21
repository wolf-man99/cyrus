import type { LucideIcon } from 'lucide-react';

export interface QuickLogAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect(): void;
}

/** One-tap logging actions for a domain (same visual language as Today's quick actions). */
export function QuickLogBar({ actions }: { actions: QuickLogAction[] }) {
  return (
    <section aria-label="Quick log">
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {actions.map(({ id, label, icon: Icon, onSelect }) => (
          <li key={id} className="shrink-0">
            <button
              type="button"
              onClick={onSelect}
              className="glass inline-flex h-11 items-center gap-2 rounded-full pr-4 pl-3 text-subhead font-medium transition-[background-color,transform] hover:bg-white/[0.08] active:scale-[0.98]"
            >
              <Icon className="size-4.5 text-secondary" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
