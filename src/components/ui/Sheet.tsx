import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Sticky footer (primary action). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 * Built on Radix Dialog for focus trapping, Escape to close and screen-reader semantics.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'sheet-content fixed z-50 flex max-h-[92dvh] flex-col overflow-hidden border border-line-strong bg-surface shadow-float outline-none',
            'inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)]',
            'sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[min(30rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-sheet)]',
            className,
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
          />
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />
          <header className="relative flex items-start justify-between gap-4 px-6 pt-4 sm:pt-6">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-title font-bold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-subhead text-muted">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="glass -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-fg active:scale-95"
            >
              <X className="size-[18px]" />
            </Dialog.Close>
          </header>
          <div className={cn('relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-5', footer ? 'pb-4' : 'pb-0')}>
            {children}
          </div>
          {footer && (
            <footer className="relative px-6 pt-2 pb-[max(var(--safe-bottom),1.25rem)] sm:pb-6">{footer}</footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Sticky action area for forms rendered inside a Sheet body. */
export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-6 bg-gradient-to-t from-surface via-surface to-surface/0 px-6 pt-4 pb-[max(var(--safe-bottom),1.25rem)] sm:pb-6">
      {children}
    </div>
  );
}
