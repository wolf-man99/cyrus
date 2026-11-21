import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CyrusStatus } from '../conversationMachine';

interface TalkButtonProps {
  status: CyrusStatus;
  onStart(): void;
  onStop(): void;
  onInterrupt(): void;
}

/** A quick tap latches the mic open (tap again to send); a longer press is classic push-to-talk. */
const TAP_THRESHOLD_MS = 280;

/**
 * The primary control. Push-to-talk by default; becomes "interrupt" while Cyrus is busy.
 * Works with touch, mouse and keyboard (hold Space / Enter).
 */
export function TalkButton({ status, onStart, onStop, onInterrupt }: TalkButtonProps) {
  const holding = useRef(false);
  const pressedAt = useRef(0);
  const [latched, setLatched] = useState(false);
  const busy = status === 'thinking' || status === 'speaking';
  const listening = status === 'listening';

  // If listening ends for any other reason (error, interruption), drop the latch.
  useEffect(() => {
    if (!listening && !holding.current) setLatched(false);
  }, [listening]);

  const press = () => {
    if (busy) {
      onInterrupt();
      return;
    }
    if (latched) {
      setLatched(false);
      onStop();
      return;
    }
    holding.current = true;
    pressedAt.current = performance.now();
    onStart();
  };

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    if (performance.now() - pressedAt.current < TAP_THRESHOLD_MS) setLatched(true);
    else onStop();
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      press();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      release();
    }
  };

  const label = busy
    ? 'interrupt'
    : listening
      ? latched
        ? 'tap to send'
        : 'release to send'
      : 'hold to talk';

  const ariaLabel = busy ? 'Interrupt Cyrus' : listening ? 'Send to Cyrus' : 'Talk to Cyrus — hold, or tap to start';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={listening}
        onPointerDown={onPointerDown}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          'relative flex size-[4.75rem] touch-none items-center justify-center rounded-full border-[3px] border-white select-none [-webkit-touch-callout:none]',
          'transition-transform duration-200 active:scale-95',
          listening && 'scale-105',
        )}
      >
        {listening && (
          <span aria-hidden className="absolute -inset-2 animate-ping rounded-full border border-white/40 [animation-duration:1.8s]" />
        )}
        <span
          className={cn(
            'flex items-center justify-center rounded-full transition-all duration-300',
            listening ? 'size-[3.6rem] bg-white text-canvas' : 'size-[3.6rem] text-white',
          )}
        >
          {busy ? (
            <Square className="size-7 fill-white text-white" strokeWidth={0} />
          ) : listening && latched ? (
            <ArrowUp className="size-8" strokeWidth={2.6} />
          ) : (
            <Mic className="size-8" strokeWidth={2} />
          )}
        </span>
      </button>
      <span className="text-footnote font-medium text-white/80">{label}</span>
    </div>
  );
}
