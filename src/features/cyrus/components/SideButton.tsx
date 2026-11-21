import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SideButtonProps {
  label: string;
  icon: ReactNode;
  onClick(): void;
  pressed?: boolean;
  ariaLabel?: string;
}

/** Small labelled round control (Yap "night mode" / "finish" pattern). */
export function SideButton({ label, icon, onClick, pressed, ariaLabel }: SideButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={ariaLabel ?? label}
      className="group flex w-16 flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          'flex size-[3.25rem] items-center justify-center rounded-full border transition-all duration-200 group-active:scale-90',
          pressed ? 'border-transparent bg-white text-canvas' : 'border-white/10 bg-white/10 text-white backdrop-blur-md group-hover:bg-white/15',
        )}
      >
        {icon}
      </span>
      <span className="text-caption font-medium whitespace-nowrap text-white/75">{label}</span>
    </button>
  );
}
